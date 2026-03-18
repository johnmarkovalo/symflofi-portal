-- ============================================================================
-- Migration: 3 revoke modes + prevent re-binding after unbind
-- Date: 2026-03-18
-- Description: Add unbound_from_uuid column so validate_license can block
--              re-binding on the same device after unbind.
-- ============================================================================

-- 1. Add column to track which machine UUID was unbound
ALTER TABLE license_keys ADD COLUMN IF NOT EXISTS unbound_from_uuid TEXT;

-- 2. Update validate_license to check unbound_from_uuid
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
         duration_days, created_at, activated_at, is_revoked, product,
         unbound_from_uuid
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

  -- 2b. Check if this device was unbound — prevent re-binding on same device
  IF v_key.unbound_from_uuid IS NOT NULL AND v_key.unbound_from_uuid = p_machine_uuid THEN
    RETURN jsonb_build_object('valid', false, 'error', 'License was unbound from this device. Activate on a different device or contact your operator.');
  END IF;

  -- 3. Look up the tier's feature limits
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
    v_tier := ROW(
      NULL, v_key.tier, v_key.tier, 0, 365,
      3, 50, 0, false, false, false, false,
      1, 'manual', 'community', false, false, 0,
      now(), now(), 'symflofi', '{}'::jsonb
    )::license_tiers;
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

  -- 7. Clear license from old machines
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
      'License reused on new machine (UUID: ' || p_machine_uuid || ')'
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

  -- 10. Bind license key + clear unbound flag (successful activation on new device)
  UPDATE license_keys
  SET is_activated = true,
      machine_id = v_machine.id,
      activated_at = COALESCE(v_key.activated_at, now()),
      unbound_from_uuid = NULL
  WHERE id = v_key.id;

  -- 11. License audit trail
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

  -- 12. Return result with features + limits
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
