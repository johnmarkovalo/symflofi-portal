-- ============================================================
-- RPC: create_operator_on_signup
-- Called during signup to create the operator record.
-- Uses SECURITY DEFINER to bypass RLS (the user has no operator
-- row yet, so RLS would block the insert).
-- ============================================================

CREATE OR REPLACE FUNCTION create_operator_on_signup(
  p_auth_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_plan TEXT DEFAULT 'trial'
) RETURNS UUID AS $$
DECLARE
  v_operator_id UUID;
BEGIN
  -- Only allow users to create their own operator record
  IF p_auth_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create operator record for another user';
  END IF;

  -- Prevent duplicate operator records
  IF EXISTS (SELECT 1 FROM operators WHERE auth_user_id = p_auth_user_id) THEN
    SELECT id INTO v_operator_id FROM operators WHERE auth_user_id = p_auth_user_id;
    RETURN v_operator_id;
  END IF;

  INSERT INTO operators (auth_user_id, email, name, plan)
  VALUES (p_auth_user_id, p_email, p_name, p_plan)
  RETURNING id INTO v_operator_id;

  RETURN v_operator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
