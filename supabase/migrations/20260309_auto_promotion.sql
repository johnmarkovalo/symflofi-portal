-- ============================================================================
-- Migration: Auto Distributor Promotion
-- Date: 2026-03-09
-- Description: Auto-promote operators to distributor when license threshold met
-- ============================================================================

-- 1. Add promotion threshold columns to distributor_tiers
ALTER TABLE distributor_tiers
  ADD COLUMN IF NOT EXISTS min_licenses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_licenses INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN distributor_tiers.min_licenses IS 'Minimum total licenses to auto-promote (0 = manual only)';
COMMENT ON COLUMN distributor_tiers.bonus_licenses IS 'Free bonus licenses awarded on promotion';

-- 2. Set default thresholds for seeded tiers
UPDATE distributor_tiers SET min_licenses = 100, bonus_licenses = 10 WHERE name = 'bronze';
UPDATE distributor_tiers SET min_licenses = 300, bonus_licenses = 25 WHERE name = 'silver';
UPDATE distributor_tiers SET min_licenses = 500, bonus_licenses = 50 WHERE name = 'gold';

-- 3. Function to check and apply auto-promotion
CREATE OR REPLACE FUNCTION check_distributor_promotion()
RETURNS TRIGGER AS $$
DECLARE
  op_id UUID;
  license_count INTEGER;
  current_tier TEXT;
  target_tier RECORD;
BEGIN
  -- Get the operator_id from the affected row
  op_id := COALESCE(NEW.operator_id, OLD.operator_id);
  IF op_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count total licenses for this operator
  SELECT COUNT(*) INTO license_count
  FROM license_keys
  WHERE operator_id = op_id;

  -- Get operator's current distributor tier
  SELECT distributor_tier INTO current_tier
  FROM operators
  WHERE id = op_id;

  -- Find the highest tier this operator qualifies for
  -- (min_licenses > 0 means auto-promotion is enabled for that tier)
  SELECT * INTO target_tier
  FROM distributor_tiers
  WHERE min_licenses > 0
    AND min_licenses <= license_count
  ORDER BY min_licenses DESC
  LIMIT 1;

  -- No qualifying tier found
  IF target_tier IS NULL THEN
    RETURN NEW;
  END IF;

  -- Already at this tier or higher? Check by sort_order
  IF current_tier IS NOT NULL THEN
    DECLARE
      current_sort INTEGER;
    BEGIN
      SELECT sort_order INTO current_sort
      FROM distributor_tiers
      WHERE name = current_tier;

      -- Already at same or higher tier, skip
      IF current_sort IS NOT NULL AND current_sort >= target_tier.sort_order THEN
        RETURN NEW;
      END IF;
    END;
  END IF;

  -- Promote the operator
  UPDATE operators SET
    is_distributor = true,
    distributor_tier = target_tier.name,
    distributor_discount_pct = target_tier.discount_pct
  WHERE id = op_id;

  -- Log the promotion in audit trail
  INSERT INTO license_audit_log (
    license_key_id, license_key, event, to_operator_id, actor_role, note
  ) VALUES (
    gen_random_uuid(),
    'SYSTEM',
    'assigned',
    op_id,
    'system',
    format('Auto-promoted to %s distributor (%s licenses). +%s bonus licenses.',
           target_tier.label, license_count, target_tier.bonus_licenses)
  );

  -- Generate bonus licenses if configured
  IF target_tier.bonus_licenses > 0 THEN
    PERFORM generate_license_keys_bulk(
      op_id,
      'lite',
      (now() + interval '365 days')::timestamptz,
      target_tier.bonus_licenses
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger on license_keys insert/update
DROP TRIGGER IF EXISTS trg_check_distributor_promotion ON license_keys;

CREATE TRIGGER trg_check_distributor_promotion
  AFTER INSERT OR UPDATE OF operator_id ON license_keys
  FOR EACH ROW
  EXECUTE FUNCTION check_distributor_promotion();
