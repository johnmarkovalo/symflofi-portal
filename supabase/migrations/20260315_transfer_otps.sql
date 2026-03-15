-- ============================================================================
-- Migration: Transfer OTPs
-- Date: 2026-03-15
-- Description: Email OTP verification for license transfers
-- ============================================================================

-- 1. Transfer OTP table
CREATE TABLE IF NOT EXISTS transfer_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_ids UUID[] NOT NULL,
  from_operator_id UUID NOT NULL REFERENCES operators(id),
  to_operator_id UUID NOT NULL REFERENCES operators(id),
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfer_otps_from ON transfer_otps(from_operator_id);
CREATE INDEX IF NOT EXISTS idx_transfer_otps_expires ON transfer_otps(expires_at);

-- 2. RLS
ALTER TABLE transfer_otps ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_full_transfer_otps" ON transfer_otps
  FOR ALL USING ((SELECT is_admin()));

-- Operator: read own OTPs
CREATE POLICY "operator_read_own_otps" ON transfer_otps
  FOR SELECT USING (
    from_operator_id IN (
      SELECT id FROM operators WHERE auth_user_id = auth.uid()
    )
  );

-- 3. Cleanup function for expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM transfer_otps WHERE expires_at < now();
$$;
