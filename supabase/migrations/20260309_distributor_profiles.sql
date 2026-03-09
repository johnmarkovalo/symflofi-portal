-- ============================================================================
-- Migration: Distributor Public Profiles
-- Date: 2026-03-09
-- Description: Public-facing distributor directory fields
-- ============================================================================

-- 1. Add public profile fields to operators (only relevant when is_distributor = true)
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS contact_number TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT false;

COMMENT ON COLUMN operators.business_name IS 'Public display name for distributor directory';
COMMENT ON COLUMN operators.is_listed IS 'Show in public distributor directory';

-- 2. Public read policy for listed distributors (no auth required)
CREATE POLICY "public_read_listed_distributors" ON operators
  FOR SELECT USING (
    is_distributor = true AND is_listed = true
  );
