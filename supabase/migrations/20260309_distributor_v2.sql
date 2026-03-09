-- ============================================================================
-- Migration: Distributor Feature V2
-- Date: 2026-03-09
-- Description: Adds distributor flag to operators + license audit trail
-- ============================================================================

-- 1. Add distributor fields to operators
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS is_distributor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS distributor_tier TEXT CHECK (distributor_tier IN ('bronze', 'silver', 'gold')),
  ADD COLUMN IF NOT EXISTS distributor_discount_pct INTEGER DEFAULT 0 CHECK (distributor_discount_pct BETWEEN 0 AND 50);

-- 2. License audit log — lightweight trail of every license event
CREATE TABLE IF NOT EXISTS license_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key_id UUID NOT NULL,
  license_key TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('created', 'assigned', 'transferred', 'activated', 'expired', 'revoked', 'purchased')),
  from_operator_id UUID,
  to_operator_id UUID,
  actor_id UUID,
  actor_role TEXT CHECK (actor_role IN ('admin', 'operator', 'system')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_license ON license_audit_log(license_key_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON license_audit_log(created_at);

-- 3. RLS for license_audit_log
ALTER TABLE license_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_full_audit" ON license_audit_log
  FOR ALL USING ((SELECT is_admin()));

-- Operator: read audit entries for their own licenses
CREATE POLICY "operator_read_own_audit" ON license_audit_log
  FOR SELECT USING (
    to_operator_id IN (
      SELECT id FROM operators WHERE auth_user_id = auth.uid()
    )
    OR from_operator_id IN (
      SELECT id FROM operators WHERE auth_user_id = auth.uid()
    )
  );

-- 4. RLS: allow operators to update license_keys they own (for transfer — only unactivated)
-- The transfer itself is validated in application code.
CREATE POLICY "operator_transfer_licenses" ON license_keys
  FOR UPDATE USING (
    operator_id IN (
      SELECT id FROM operators WHERE auth_user_id = auth.uid()
    )
    AND is_activated = false
  ) WITH CHECK (
    true  -- new operator_id is validated in application code
  );

-- 5. Allow operators to INSERT into license_audit_log (for transfer events)
CREATE POLICY "operator_insert_audit" ON license_audit_log
  FOR INSERT WITH CHECK (
    actor_id IN (
      SELECT id FROM operators WHERE auth_user_id = auth.uid()
    )
    AND actor_role = 'operator'
  );
