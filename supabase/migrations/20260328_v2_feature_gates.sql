-- ============================================================================
-- Migration: v2.0 Feature Gates — RADIUS, SNMP, Spin Wheel, MWAN3, etc.
-- Date: 2026-03-28
-- Description: Adds license tier columns for new v2.0 features.
--              Updates validate_license RPC to return all new fields.
--              Sets per-tier values matching the pricing strategy.
-- ============================================================================

-- 1. Add new columns to license_tiers
ALTER TABLE license_tiers
  ADD COLUMN IF NOT EXISTS radius_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS snmp_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS spinwheel_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mwan_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_rates_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sub_accounts_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eloading_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Set per-tier values + sync features JSONB
-- Demo: basic features only, no premium gates
UPDATE license_tiers SET
  radius_enabled = false,
  snmp_enabled = false,
  spinwheel_enabled = false,
  mwan_enabled = false,
  promo_rates_enabled = false,
  sub_accounts_enabled = false,
  eloading_enabled = false,
  features = features || '{"radius_enabled":false,"snmp_enabled":false,"spinwheel_enabled":false,"mwan_enabled":false,"promo_rates_enabled":false,"sub_accounts_enabled":false,"eloading_enabled":false}'::jsonb
WHERE name = 'demo' AND product = 'symflofi';

-- Lite: basic paid tier — no ISP features
UPDATE license_tiers SET
  radius_enabled = false,
  snmp_enabled = false,
  spinwheel_enabled = false,
  mwan_enabled = false,
  promo_rates_enabled = false,
  sub_accounts_enabled = false,
  eloading_enabled = false,
  features = features || '{"radius_enabled":false,"snmp_enabled":false,"spinwheel_enabled":false,"mwan_enabled":false,"promo_rates_enabled":false,"sub_accounts_enabled":false,"eloading_enabled":false}'::jsonb
WHERE name = 'lite' AND product = 'symflofi';

-- Pro: full operator features — SNMP, spin wheel, MWAN, promos, sub-accounts, e-loading
UPDATE license_tiers SET
  radius_enabled = false,
  snmp_enabled = true,
  spinwheel_enabled = true,
  mwan_enabled = true,
  promo_rates_enabled = true,
  sub_accounts_enabled = true,
  eloading_enabled = true,
  features = features || '{"radius_enabled":false,"snmp_enabled":true,"spinwheel_enabled":true,"mwan_enabled":true,"promo_rates_enabled":true,"sub_accounts_enabled":true,"eloading_enabled":true}'::jsonb
WHERE name = 'pro' AND product = 'symflofi';

-- Enterprise: everything including RADIUS
UPDATE license_tiers SET
  radius_enabled = true,
  snmp_enabled = true,
  spinwheel_enabled = true,
  mwan_enabled = true,
  promo_rates_enabled = true,
  sub_accounts_enabled = true,
  eloading_enabled = true,
  features = features || '{"radius_enabled":true,"snmp_enabled":true,"spinwheel_enabled":true,"mwan_enabled":true,"promo_rates_enabled":true,"sub_accounts_enabled":true,"eloading_enabled":true}'::jsonb
WHERE name = 'enterprise' AND product = 'symflofi';

-- 3. Recreate validate_license RPC with new fields
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
  v_old_machine RECORD;
  v_is_new_activation BOOLEAN;
BEGIN
  -- 1. Look up the license key
  SELECT id, key, tier, operator_id, is_activated, machine_id,
         duration_days, created_at, activated_at, is_revoked, product
  INTO v_key
  FROM license_keys
  WHERE key = p_license_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'License key not found');
  END IF;

  -- 2. Check if license has been revoked
  IF v_key.is_revoked THEN
    RETURN jsonb_build_object('valid', false, 'error', 'License key has been revoked');
  END IF;

  -- 3. Look up the tier's feature limits (match by product + name)
  SELECT * INTO v_tier
  FROM license_tiers
  WHERE name = v_key.tier AND product = v_key.product;

  IF NOT FOUND THEN
    SELECT * INTO v_tier
    FROM license_tiers
    WHERE name = v_key.tier
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    SELECT * INTO v_tier FROM (
      SELECT
        NULL::UUID AS id,
        v_key.tier AS name,
        v_key.tier AS label,
        0 AS price_cents,
        365 AS duration_days,
        3 AS max_concurrent_users,
        50 AS max_vouchers_per_month,
        0 AS max_sub_vendos,
        false AS epayment_enabled,
        false AS cloud_dashboard,
        false AS remote_access,
        false AS pppoe_enabled,
        1 AS sales_history_days,
        'manual'::TEXT AS ota_channel,
        'community'::TEXT AS support_level,
        false AS is_public,
        false AS is_highlighted,
        0 AS sort_order,
        now() AS created_at,
        now() AS updated_at,
        'symflofi'::TEXT AS product,
        '{}'::JSONB AS features,
        false AS vlan_enabled,
        0 AS max_vlans,
        false AS session_roaming,
        3 AS max_subscribers,
        false AS theme_customization,
        false AS radius_enabled,
        false AS snmp_enabled,
        false AS spinwheel_enabled,
        false AS mwan_enabled,
        false AS promo_rates_enabled,
        false AS sub_accounts_enabled,
        false AS eloading_enabled
    ) AS fallback;
  END IF;

  -- 4. Compute expiry
  IF v_key.activated_at IS NOT NULL THEN
    v_expires_at := v_key.activated_at + (v_key.duration_days || ' days')::interval;
    IF v_expires_at < now() THEN
      RETURN jsonb_build_object('valid', false, 'error', 'License key has expired');
    END IF;
  ELSE
    v_expires_at := now() + (v_key.duration_days || ' days')::interval;
  END IF;

  -- 5. Ensure operator_id exists
  IF v_key.operator_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'License key has no operator assigned');
  END IF;

  -- 6. Check if key is bound to a different machine
  IF v_key.is_activated AND v_key.machine_id IS NOT NULL THEN
    SELECT * INTO v_existing_machine FROM machines WHERE id = v_key.machine_id;
    IF FOUND AND v_existing_machine.machine_uuid != p_machine_uuid THEN
      RETURN jsonb_build_object('valid', false, 'error', 'License key is already bound to another machine');
    END IF;
  END IF;

  v_is_new_activation := NOT v_key.is_activated OR v_key.machine_id IS NULL;

  -- 7. Clear license from old machines that still hold this key
  FOR v_old_machine IN
    SELECT id, machine_uuid FROM machines
    WHERE license_key = p_license_key
      AND machine_uuid != p_machine_uuid
  LOOP
    UPDATE machines
    SET license_key = NULL,
        license_tier = NULL,
        license_expires_at = NULL,
        is_online = false,
        status = 'decommissioned'
    WHERE id = v_old_machine.id;

    INSERT INTO machine_audit_log (
      machine_id, machine_uuid, event, license_key, operator_id, note
    ) VALUES (
      v_old_machine.id, v_old_machine.machine_uuid, 'decommissioned',
      p_license_key, v_key.operator_id,
      'License reused on new machine (UUID: ' || p_machine_uuid || '). Old machine decommissioned.'
    );
  END LOOP;

  -- 8. Upsert machine row
  INSERT INTO machines (
    operator_id, machine_uuid, license_key, license_tier,
    license_expires_at, app_version, hardware, os_version,
    last_seen_at, is_online, status, product
  ) VALUES (
    v_key.operator_id, p_machine_uuid, p_license_key, v_key.tier,
    v_expires_at, p_app_version, p_hardware, p_os_version,
    now(), true, 'active', COALESCE(v_key.product, 'symflofi')
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
    status = 'active',
    product = COALESCE(v_key.product, machines.product)
  RETURNING * INTO v_machine;

  -- 9. Audit log
  INSERT INTO machine_audit_log (
    machine_id, machine_uuid, event, license_key, operator_id, note
  ) VALUES (
    v_machine.id, p_machine_uuid, 'activated',
    p_license_key, v_key.operator_id,
    'License activated on machine'
  );

  -- 10. Bind license key
  UPDATE license_keys
  SET is_activated = true,
      machine_id = v_machine.id,
      activated_at = COALESCE(v_key.activated_at, now())
  WHERE id = v_key.id;

  -- 11. License audit trail (new activations only)
  IF v_is_new_activation THEN
    INSERT INTO license_audit_log (
      license_key_id, license_key, event,
      to_operator_id, actor_id, actor_role,
      note
    ) VALUES (
      v_key.id, v_key.key, 'activated',
      v_key.operator_id, v_key.operator_id, 'system',
      'Activated on machine ' || p_machine_uuid
    );
  END IF;

  -- 12. Return result with ALL limits + features
  --     IMPORTANT: every field the device's TierLimits struct expects
  --     must be present here. If you add a new feature, add it below.
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
      'sessionRoaming', COALESCE(v_tier.session_roaming, false),
      'remoteAccess', COALESCE(v_tier.remote_access, false),
      'pppoeEnabled', COALESCE(v_tier.pppoe_enabled, false),
      'vlanEnabled', COALESCE(v_tier.vlan_enabled, false),
      'maxVlans', COALESCE(v_tier.max_vlans, 0),
      'salesHistoryDays', COALESCE(v_tier.sales_history_days, 1),
      'otaChannel', COALESCE(v_tier.ota_channel, 'manual'),
      'themeCustomization', COALESCE(v_tier.theme_customization, false),
      'maxSubscribers', COALESCE(v_tier.max_subscribers, 3),
      'eloadingEnabled', COALESCE(v_tier.eloading_enabled, false),
      'radiusEnabled', COALESCE(v_tier.radius_enabled, false),
      'snmpEnabled', COALESCE(v_tier.snmp_enabled, false),
      'spinwheelEnabled', COALESCE(v_tier.spinwheel_enabled, false),
      'mwanEnabled', COALESCE(v_tier.mwan_enabled, false),
      'promoRatesEnabled', COALESCE(v_tier.promo_rates_enabled, false),
      'subAccountsEnabled', COALESCE(v_tier.sub_accounts_enabled, false)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
