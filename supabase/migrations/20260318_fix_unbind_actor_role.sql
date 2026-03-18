-- Fix: unbind_license used actor_role='device' which violates CHECK constraint.
-- The allowed values are: 'admin', 'operator', 'system'. Use 'system' instead.

CREATE OR REPLACE FUNCTION unbind_license(
  p_license_key TEXT,
  p_machine_uuid TEXT
) RETURNS JSONB AS $$
DECLARE
  v_key RECORD;
  v_machine RECORD;
BEGIN
  SELECT id, key, tier, operator_id, is_activated, machine_id, is_revoked
  INTO v_key
  FROM license_keys
  WHERE key = p_license_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'License key not found');
  END IF;

  IF v_key.is_revoked THEN
    RETURN jsonb_build_object('success', false, 'error', 'License key has been revoked');
  END IF;

  IF NOT v_key.is_activated OR v_key.machine_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'License is not bound to any machine');
  END IF;

  SELECT * INTO v_machine FROM machines WHERE id = v_key.machine_id;
  IF NOT FOUND OR v_machine.machine_uuid != p_machine_uuid THEN
    RETURN jsonb_build_object('success', false, 'error', 'This device is not bound to this license');
  END IF;

  -- Decommission the machine
  UPDATE machines
  SET license_key = NULL,
      license_tier = NULL,
      license_expires_at = NULL,
      is_online = false,
      status = 'decommissioned'
  WHERE id = v_key.machine_id;

  -- Unbind the license key
  UPDATE license_keys
  SET machine_id = NULL,
      is_activated = false,
      unbound_from_uuid = p_machine_uuid
  WHERE id = v_key.id;

  -- Audit logs (actor_role must be admin/operator/system)
  INSERT INTO license_audit_log (
    license_key_id, license_key, event,
    from_operator_id, to_operator_id,
    actor_id, actor_role, note
  ) VALUES (
    v_key.id, v_key.key, 'revoked',
    v_key.operator_id, v_key.operator_id,
    v_key.operator_id, 'system',
    'License unbound from device ' || p_machine_uuid || ' (initiated from tablet)'
  );

  INSERT INTO machine_audit_log (
    machine_id, machine_uuid, event, license_key, operator_id, note
  ) VALUES (
    v_key.machine_id, p_machine_uuid, 'decommissioned',
    p_license_key, v_key.operator_id,
    'License unbound by operator from device'
  );

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
