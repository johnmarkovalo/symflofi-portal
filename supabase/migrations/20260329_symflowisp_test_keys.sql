-- ============================================================================
-- Migration: SymfloWISP Test License Keys
-- Date: 2026-03-29
-- Description: Creates test license keys for SymfloWISP development/QA.
--              These keys are tied to a test operator and test machine.
--              SAFE: only inserts, does not modify existing data.
--
-- IMPORTANT: Remove or revoke these keys before production launch.
-- ============================================================================

-- 1. Ensure a test operator exists (use existing admin or create one)
-- Uses the first operator found, or you can specify an ID.
DO $$
DECLARE
  v_operator_id UUID;
  v_starter_tier_id UUID;
  v_business_tier_id UUID;
  v_enterprise_tier_id UUID;
BEGIN
  -- Get the first operator (admin user)
  SELECT id INTO v_operator_id FROM auth.users LIMIT 1;

  IF v_operator_id IS NULL THEN
    RAISE NOTICE 'No operator found — skipping test key generation';
    RETURN;
  END IF;

  -- Get SymfloWISP tier IDs
  SELECT id INTO v_starter_tier_id FROM license_tiers WHERE name = 'starter' AND product = 'symflowisp';
  SELECT id INTO v_business_tier_id FROM license_tiers WHERE name = 'business' AND product = 'symflowisp';
  SELECT id INTO v_enterprise_tier_id FROM license_tiers WHERE name = 'enterprise' AND product = 'symflowisp';

  -- 2. Insert test license keys
  -- Key format: SW-TEST-<TIER>-0001

  -- Starter key
  INSERT INTO license_keys (key, tier, operator_id, duration_days, is_activated, product)
  VALUES ('SW-TEST-START-0001', 'starter', v_operator_id, 365, false, 'symflowisp')
  ON CONFLICT (key) DO NOTHING;

  -- Business key
  INSERT INTO license_keys (key, tier, operator_id, duration_days, is_activated, product)
  VALUES ('SW-TEST-BUSNS-0001', 'business', v_operator_id, 365, false, 'symflowisp')
  ON CONFLICT (key) DO NOTHING;

  -- Enterprise key
  INSERT INTO license_keys (key, tier, operator_id, duration_days, is_activated, product)
  VALUES ('SW-TEST-ENTER-0001', 'enterprise', v_operator_id, 365, false, 'symflowisp')
  ON CONFLICT (key) DO NOTHING;

  RAISE NOTICE 'SymfloWISP test keys created for operator %', v_operator_id;
  RAISE NOTICE 'Starter:    SW-TEST-START-0001';
  RAISE NOTICE 'Business:   SW-TEST-BUSNS-0001';
  RAISE NOTICE 'Enterprise: SW-TEST-ENTER-0001';
END $$;
