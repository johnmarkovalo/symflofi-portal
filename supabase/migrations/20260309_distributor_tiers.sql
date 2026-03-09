-- ============================================================================
-- Migration: Distributor Tiers Table
-- Date: 2026-03-09
-- Description: Dynamic distributor tier list (replaces hardcoded tiers)
-- ============================================================================

-- 1. Create distributor_tiers table
CREATE TABLE IF NOT EXISTS distributor_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  discount_pct INTEGER NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 50),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Seed default tiers
INSERT INTO distributor_tiers (name, label, discount_pct, sort_order) VALUES
  ('bronze', 'Bronze', 20, 1),
  ('silver', 'Silver', 30, 2),
  ('gold',   'Gold',   40, 3)
ON CONFLICT (name) DO NOTHING;

-- 3. Drop the old CHECK constraint on operators.distributor_tier so it's not limited to hardcoded values
-- The constraint name may vary; this handles the common pattern
DO $$
BEGIN
  ALTER TABLE operators DROP CONSTRAINT IF EXISTS operators_distributor_tier_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- 4. Add FK-like soft reference (no hard FK to keep it flexible, but add a comment)
COMMENT ON COLUMN operators.distributor_tier IS 'References distributor_tiers.name';

-- 5. RLS for distributor_tiers
ALTER TABLE distributor_tiers ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_full_distributor_tiers" ON distributor_tiers
  FOR ALL USING ((SELECT is_admin()));

-- All authenticated users can read tiers (needed for forms)
CREATE POLICY "authenticated_read_tiers" ON distributor_tiers
  FOR SELECT USING (auth.uid() IS NOT NULL);
