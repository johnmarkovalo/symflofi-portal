-- ============================================================================
-- Migration: Add features JSONB column to license_tiers
-- Date: 2026-03-18
-- Description: Single flexible column for product-specific feature flags.
--              Avoids adding new columns for every feature change.
-- ============================================================================

-- 1. Add features column
ALTER TABLE license_tiers ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Populate PlayTab tier features
UPDATE license_tiers SET features = '{
  "max_whitelisted_apps": 5,
  "max_tablets_per_account": 3,
  "session_history_days": 7,
  "income_tracking": false,
  "earnings_reports": false,
  "cloud_sync": false,
  "lock_screen_customization": false,
  "csv_export": false,
  "remote_access": false
}'::jsonb
WHERE product = 'playtab' AND name = 'playtab_lite';

UPDATE license_tiers SET features = '{
  "max_whitelisted_apps": 15,
  "max_tablets_per_account": 10,
  "session_history_days": 30,
  "income_tracking": true,
  "earnings_reports": true,
  "cloud_sync": true,
  "lock_screen_customization": true,
  "csv_export": false,
  "remote_access": true
}'::jsonb
WHERE product = 'playtab' AND name = 'playtab_pro';

UPDATE license_tiers SET features = '{
  "max_whitelisted_apps": 999,
  "max_tablets_per_account": 999,
  "session_history_days": -1,
  "income_tracking": true,
  "earnings_reports": true,
  "cloud_sync": true,
  "lock_screen_customization": true,
  "csv_export": true,
  "remote_access": true
}'::jsonb
WHERE product = 'playtab' AND name = 'playtab_business';

-- 3. Populate SymfloFi tier features (mirror existing columns for consistency)
UPDATE license_tiers SET features = jsonb_build_object(
  'max_concurrent_users', COALESCE(max_concurrent_users, 0),
  'max_vouchers_per_month', max_vouchers_per_month,
  'max_sub_vendos', COALESCE(max_sub_vendos, 0),
  'epayment_enabled', COALESCE(epayment_enabled, false),
  'cloud_dashboard', COALESCE(cloud_dashboard, false),
  'remote_access', COALESCE(remote_access, false),
  'pppoe_enabled', COALESCE(pppoe_enabled, false),
  'sales_history_days', COALESCE(sales_history_days, 1),
  'ota_channel', COALESCE(ota_channel, 'manual')
)
WHERE product = 'symflofi' AND features = '{}'::jsonb;

-- 4. Update validate_license to include features in the response
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
      now(), now(), 'symflofi', '{}'::jsonb
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

  -- 8. Return validation result with limits + features
  RETURN jsonb_build_object(
    'valid', true,
    'tier', v_key.tier,
    'product', COALESCE(v_key.product, 'symflofi'),
    'expiresAt', to_char(v_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'machineId', v_machine.id::text,
    'activated', true,
    'features', COALESCE(v_tier.features, '{}'::jsonb),
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
