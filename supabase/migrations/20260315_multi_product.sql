-- ============================================================================
-- Migration: Multi-Product Support (SymfloFi + PlayTab)
-- Date: 2026-03-15
-- Description: Add product column to shared tables, seed PlayTab tiers,
--              update validate_license RPC, add PlayTab session/revenue tables
-- ============================================================================

-- 1. Add product column to core tables
ALTER TABLE license_tiers ADD COLUMN IF NOT EXISTS product TEXT NOT NULL DEFAULT 'symflofi';
ALTER TABLE license_keys ADD COLUMN IF NOT EXISTS product TEXT NOT NULL DEFAULT 'symflofi';
ALTER TABLE machines ADD COLUMN IF NOT EXISTS product TEXT NOT NULL DEFAULT 'symflofi';

-- 2. Replace name-only unique constraint with composite (product, name)
ALTER TABLE license_tiers DROP CONSTRAINT IF EXISTS license_tiers_name_key;
ALTER TABLE license_tiers ADD CONSTRAINT license_tiers_product_name_key UNIQUE (product, name);

-- 3. Add esp32_device_id column to machines (for PlayTab ESP32 binding)
ALTER TABLE machines ADD COLUMN IF NOT EXISTS esp32_device_id TEXT;

-- 4. Indexes for product column
CREATE INDEX IF NOT EXISTS idx_license_tiers_product ON license_tiers(product);
CREATE INDEX IF NOT EXISTS idx_license_keys_product ON license_keys(product);
CREATE INDEX IF NOT EXISTS idx_machines_product ON machines(product);

-- 5. Seed PlayTab license tiers
INSERT INTO license_tiers (
  name, label, price_cents, duration_days,
  max_concurrent_users, max_vouchers_per_month, max_sub_vendos,
  epayment_enabled, cloud_dashboard, remote_access, pppoe_enabled,
  sales_history_days, ota_channel, support_level,
  is_public, is_highlighted, sort_order, product
) VALUES
  -- Lite: basic coin operation, no cloud, no remote
  (
    'playtab_lite', 'Lite', 29900, 365,
    NULL, NULL, 0,
    false, false, false, false,
    7, 'stable', 'email_48h',
    true, false, 5, 'playtab'
  ),
  -- Pro: cloud dashboard + remote access
  (
    'playtab_pro', 'Pro', 49900, 365,
    NULL, NULL, 0,
    false, true, true, false,
    30, 'stable', 'email_24h',
    true, true, 6, 'playtab'
  ),
  -- Business: unlimited history, priority support
  (
    'playtab_business', 'Business', 99900, 365,
    NULL, NULL, 0,
    false, true, true, false,
    -1, 'stable', 'priority',
    true, false, 7, 'playtab'
  )
ON CONFLICT (product, name) DO NOTHING;

-- 6. Update validate_license RPC to handle product column
CREATE OR REPLACE FUNCTION validate_license(
  p_license_key TEXT,
  p_machine_uuid TEXT,
  p_app_version TEXT DEFAULT NULL,
  p_hardware TEXT DEFAULT NULL,
  p_os_version TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_key RECORD;
  v_tier RECORD;
  v_expires_at TIMESTAMPTZ;
  v_machine RECORD;
  v_existing_machine RECORD;
BEGIN
  -- 1. Look up the license key
  SELECT id, key, tier, operator_id, is_activated, machine_id,
         duration_days, created_at, activated_at, product
  INTO v_key
  FROM license_keys
  WHERE key = p_license_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'License key not found');
  END IF;

  -- 2. Look up the tier's feature limits (match by product + name)
  SELECT * INTO v_tier
  FROM license_tiers
  WHERE name = v_key.tier AND product = v_key.product;

  -- Fallback: try without product filter (backward compat)
  IF NOT FOUND THEN
    SELECT * INTO v_tier
    FROM license_tiers
    WHERE name = v_key.tier
    LIMIT 1;
  END IF;

  -- Fallback: if tier row is missing, use safe defaults
  IF NOT FOUND THEN
    v_tier := ROW(
      NULL, v_key.tier, v_key.tier, 0, 365,
      3, 50, 0, false, false, false, false,
      1, 'manual', 'community', false, false, 0,
      now(), now(), 'symflofi'
    )::license_tiers;
  END IF;

  -- 3. Compute expiry from first activation + duration_days
  IF v_key.activated_at IS NOT NULL THEN
    v_expires_at := v_key.activated_at + (v_key.duration_days || ' days')::interval;

    IF v_expires_at < now() THEN
      RETURN jsonb_build_object('valid', false, 'error', 'License key has expired');
    END IF;
  ELSE
    v_expires_at := now() + (v_key.duration_days || ' days')::interval;
  END IF;

  -- 4. Ensure operator_id exists on the key
  IF v_key.operator_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'License key has no operator assigned');
  END IF;

  -- 5. Check if key is already bound to a DIFFERENT machine
  IF v_key.is_activated AND v_key.machine_id IS NOT NULL THEN
    SELECT * INTO v_existing_machine FROM machines WHERE id = v_key.machine_id;
    IF FOUND AND v_existing_machine.machine_uuid != p_machine_uuid THEN
      RETURN jsonb_build_object('valid', false, 'error', 'License key is already bound to another machine');
    END IF;
  END IF;

  -- 6. Upsert machine row with product
  INSERT INTO machines (
    operator_id, machine_uuid, license_key, license_tier,
    license_expires_at, app_version, hardware, os_version,
    last_seen_at, is_online, product
  ) VALUES (
    v_key.operator_id, p_machine_uuid, p_license_key, v_key.tier,
    v_expires_at, p_app_version, p_hardware, p_os_version,
    now(), true, COALESCE(v_key.product, 'symflofi')
  )
  ON CONFLICT (machine_uuid) DO UPDATE SET
    operator_id = v_key.operator_id,
    license_key = p_license_key,
    license_tier = v_key.tier,
    license_expires_at = v_expires_at,
    app_version = COALESCE(p_app_version, machines.app_version),
    hardware = COALESCE(p_hardware, machines.hardware),
    os_version = COALESCE(p_os_version, machines.os_version),
    last_seen_at = now(),
    is_online = true,
    product = COALESCE(v_key.product, machines.product)
  RETURNING * INTO v_machine;

  -- 7. Bind license key to this machine
  UPDATE license_keys
  SET is_activated = true,
      machine_id = v_machine.id,
      activated_at = COALESCE(v_key.activated_at, now())
  WHERE id = v_key.id;

  -- 8. Return validation result with REAL tier limits + product
  RETURN jsonb_build_object(
    'valid', true,
    'tier', v_key.tier,
    'product', COALESCE(v_key.product, 'symflofi'),
    'expiresAt', to_char(v_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'machineId', v_machine.id::text,
    'activated', true,
    'limits', jsonb_build_object(
      'maxConcurrentUsers', COALESCE(v_tier.max_concurrent_users, 0),
      'maxVouchersPerMonth', v_tier.max_vouchers_per_month,
      'maxSubVendos', COALESCE(v_tier.max_sub_vendos, 0),
      'epaymentEnabled', COALESCE(v_tier.epayment_enabled, false),
      'cloudDashboard', COALESCE(v_tier.cloud_dashboard, false),
      'remoteAccess', COALESCE(v_tier.remote_access, false),
      'salesHistoryDays', COALESCE(v_tier.sales_history_days, 1),
      'otaChannel', COALESCE(v_tier.ota_channel, 'manual')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update generate_license_key to support PlayTab prefixes
CREATE OR REPLACE FUNCTION generate_license_key(
  p_operator_id UUID DEFAULT NULL,
  p_tier TEXT DEFAULT 'lite',
  p_duration_days INTEGER DEFAULT 365,
  p_product TEXT DEFAULT 'symflofi'
)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result TEXT;
  i INTEGER;
  seg INTEGER;
BEGIN
  IF p_product = 'playtab' THEN
    CASE p_tier
      WHEN 'playtab_lite' THEN prefix := 'PTLI';
      WHEN 'playtab_pro' THEN prefix := 'PTPR';
      WHEN 'playtab_business' THEN prefix := 'PTBS';
      ELSE prefix := 'PTLI';
    END CASE;
  ELSIF p_product = 'symflokiosk' THEN
    CASE p_tier
      WHEN 'lite' THEN prefix := 'SKLI';
      WHEN 'pro' THEN prefix := 'SKPR';
      WHEN 'enterprise' THEN prefix := 'SKEN';
      ELSE prefix := 'SKTR';
    END CASE;
  ELSE
    CASE p_tier
      WHEN 'lite' THEN prefix := 'SFLI';
      WHEN 'pro' THEN prefix := 'SFPR';
      WHEN 'enterprise' THEN prefix := 'SFEN';
      ELSE prefix := 'SFTR';
    END CASE;
  END IF;

  result := prefix || '-';
  FOR seg IN 1..3 LOOP
    FOR i IN 1..4 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    IF seg < 3 THEN result := result || '-'; END IF;
  END LOOP;

  INSERT INTO license_keys (key, tier, operator_id, duration_days, product)
  VALUES (result, p_tier, p_operator_id, p_duration_days, p_product);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. PlayTab session logs (synced from tablet on Pro/Business tiers)
CREATE TABLE IF NOT EXISTS playtab_sessions (
  id TEXT PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  coins_inserted INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  earnings DECIMAL NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playtab_sessions_machine ON playtab_sessions(machine_id);
CREATE INDEX IF NOT EXISTS idx_playtab_sessions_started ON playtab_sessions(started_at DESC);

ALTER TABLE playtab_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "playtab_sessions_own" ON playtab_sessions
  FOR ALL USING (machine_id IN (
    SELECT id FROM machines WHERE operator_id IN (
      SELECT id FROM operators WHERE auth_user_id = auth.uid()
    )
  ));

CREATE POLICY "service_role_playtab_sessions" ON playtab_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "admin_playtab_sessions" ON playtab_sessions
  FOR ALL USING (is_admin());

-- 9. PlayTab daily revenue (auto-aggregated from sessions)
CREATE TABLE IF NOT EXISTS playtab_daily_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  session_count INTEGER NOT NULL DEFAULT 0,
  total_coins INTEGER NOT NULL DEFAULT 0,
  total_earnings DECIMAL NOT NULL DEFAULT 0,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(machine_id, date)
);

CREATE INDEX IF NOT EXISTS idx_playtab_daily_revenue_machine_date
  ON playtab_daily_revenue(machine_id, date DESC);

ALTER TABLE playtab_daily_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "playtab_daily_revenue_own" ON playtab_daily_revenue
  FOR ALL USING (machine_id IN (
    SELECT id FROM machines WHERE operator_id IN (
      SELECT id FROM operators WHERE auth_user_id = auth.uid()
    )
  ));

CREATE POLICY "service_role_playtab_daily_revenue" ON playtab_daily_revenue
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "admin_playtab_daily_revenue" ON playtab_daily_revenue
  FOR ALL USING (is_admin());

-- Trigger: auto-aggregate daily revenue on session insert
CREATE OR REPLACE FUNCTION update_playtab_daily_revenue()
RETURNS TRIGGER AS $$
DECLARE
  session_date DATE;
BEGIN
  session_date := DATE(NEW.started_at AT TIME ZONE 'Asia/Manila');

  INSERT INTO playtab_daily_revenue (
    machine_id, date, session_count, total_coins, total_earnings, total_duration_seconds
  ) VALUES (
    NEW.machine_id, session_date, 1, NEW.coins_inserted, NEW.earnings, NEW.duration_seconds
  )
  ON CONFLICT (machine_id, date) DO UPDATE SET
    session_count = playtab_daily_revenue.session_count + 1,
    total_coins = playtab_daily_revenue.total_coins + EXCLUDED.total_coins,
    total_earnings = playtab_daily_revenue.total_earnings + EXCLUDED.total_earnings,
    total_duration_seconds = playtab_daily_revenue.total_duration_seconds + EXCLUDED.total_duration_seconds,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_playtab_daily_revenue ON playtab_sessions;
CREATE TRIGGER trg_update_playtab_daily_revenue
  AFTER INSERT ON playtab_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_playtab_daily_revenue();
