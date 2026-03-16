-- ============================================================================
-- Migration: Make machines license columns nullable + fix unique constraint
-- Date: 2026-03-16
-- Description: license_key, license_tier, license_expires_at must be nullable
--              so decommissioned machines can have these cleared to NULL.
--              The UNIQUE constraint on license_key is changed to a partial
--              index that only enforces uniqueness on non-null values.
-- ============================================================================

-- 1. Drop NOT NULL constraints
ALTER TABLE machines ALTER COLUMN license_key DROP NOT NULL;
ALTER TABLE machines ALTER COLUMN license_tier DROP NOT NULL;
ALTER TABLE machines ALTER COLUMN license_expires_at DROP NOT NULL;

-- 2. Replace unique constraint with partial unique index
ALTER TABLE machines DROP CONSTRAINT IF EXISTS machines_license_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS machines_license_key_unique
  ON machines (license_key) WHERE license_key IS NOT NULL;

-- 3. Clean up: set empty-string placeholders back to NULL
UPDATE machines SET license_key = NULL WHERE license_key = '';
UPDATE machines SET license_tier = NULL WHERE license_tier = '' OR license_tier = 'none';

-- 4. Reset test license back to unbound state
UPDATE license_keys
SET is_activated = false, machine_id = NULL
WHERE key = 'PTLI-DPWC-EYUR-RVQE';

UPDATE machines
SET license_key = NULL, license_tier = NULL, license_expires_at = NULL,
    status = 'decommissioned', is_online = false
WHERE machine_uuid = 'dae1efc57b2264ee4da4256e3c744559';

-- 5. Deploy updated validate_license() with unbind check + NULL decommission
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
BEGIN
  -- 1. Look up the license key
  SELECT id, key, tier, operator_id, is_activated, machine_id,
         duration_days, created_at, activated_at, is_revoked
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

  -- 3. Look up the tier's feature limits
  SELECT * INTO v_tier
  FROM license_tiers
  WHERE name = v_key.tier;

  IF NOT FOUND THEN
    v_tier := ROW(
      NULL, v_key.tier, v_key.tier, 0, 365,
      3, 50, 0, false, false, false, false,
      1, 'manual', 'community', false, false, 0,
      now(), now()
    )::license_tiers;
  END IF;

  -- 4. Compute expiry from first activation + duration_days
  IF v_key.activated_at IS NOT NULL THEN
    v_expires_at := v_key.activated_at + (v_key.duration_days || ' days')::interval;

    IF v_expires_at < now() THEN
      RETURN jsonb_build_object('valid', false, 'error', 'License key has expired');
    END IF;
  ELSE
    v_expires_at := now() + (v_key.duration_days || ' days')::interval;
  END IF;

  -- 5. Ensure operator_id exists on the key
  IF v_key.operator_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'License key has no operator assigned');
  END IF;

  -- 6a. Check if license was unbound (deactivated but not revoked).
  --     The old decommissioned machine must not re-bind automatically;
  --     only a NEW machine (or explicit portal re-activation) should pick it up.
  IF NOT v_key.is_activated
     AND v_key.machine_id IS NULL
     AND v_key.activated_at IS NOT NULL
  THEN
    SELECT * INTO v_existing_machine
    FROM machines
    WHERE machine_uuid = p_machine_uuid;

    IF FOUND AND v_existing_machine.status = 'decommissioned' THEN
      RETURN jsonb_build_object('valid', false, 'error', 'License has been unbound from this machine');
    END IF;
  END IF;

  -- 6b. Check if key is already bound to a DIFFERENT machine
  IF v_key.is_activated AND v_key.machine_id IS NOT NULL THEN
    SELECT * INTO v_existing_machine FROM machines WHERE id = v_key.machine_id;
    IF FOUND AND v_existing_machine.machine_uuid != p_machine_uuid THEN
      RETURN jsonb_build_object('valid', false, 'error', 'License key is already bound to another machine');
    END IF;
  END IF;

  -- 7. Clear license_key from any OLD machine that still holds this key
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
    last_seen_at, is_online, status
  ) VALUES (
    v_key.operator_id, p_machine_uuid, p_license_key, v_key.tier,
    v_expires_at, p_app_version, p_hardware, p_os_version,
    now(), true, 'active'
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
    status = 'active'
  RETURNING * INTO v_machine;

  -- 9. Log activation
  INSERT INTO machine_audit_log (
    machine_id, machine_uuid, event, license_key, operator_id, note
  ) VALUES (
    v_machine.id, p_machine_uuid, 'activated',
    p_license_key, v_key.operator_id,
    'License activated on machine'
  );

  -- 10. Bind license key to this machine
  UPDATE license_keys
  SET is_activated = true,
      machine_id = v_machine.id,
      activated_at = COALESCE(v_key.activated_at, now())
  WHERE id = v_key.id;

  -- 11. Return validation result
  RETURN jsonb_build_object(
    'valid', true,
    'tier', v_key.tier,
    'expiresAt', to_char(v_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'machineId', v_machine.id::text,
    'activated', true,
    'limits', jsonb_build_object(
      'maxConcurrentUsers', COALESCE(v_tier.max_concurrent_users, 0),
      'maxVouchersPerMonth', v_tier.max_vouchers_per_month,
      'maxSubVendos', COALESCE(v_tier.max_sub_vendos, 0),
      'epaymentEnabled', COALESCE(v_tier.epayment_enabled, false),
      'cloudDashboard', COALESCE(v_tier.cloud_dashboard, false),
      'sessionRoaming', false,
      'remoteAccess', COALESCE(v_tier.remote_access, false),
      'salesHistoryDays', COALESCE(v_tier.sales_history_days, 1),
      'otaChannel', COALESCE(v_tier.ota_channel, 'manual')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
