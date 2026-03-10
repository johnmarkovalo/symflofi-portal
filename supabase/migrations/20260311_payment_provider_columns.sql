-- Add provider-agnostic payment columns to license_orders
ALTER TABLE license_orders
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_session_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS provider_reference_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_channel_type TEXT,
  ADD COLUMN IF NOT EXISTS fee_cents INTEGER,
  ADD COLUMN IF NOT EXISTS net_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS settlement_status TEXT,
  ADD COLUMN IF NOT EXISTS estimated_settlement_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_raw JSONB;

CREATE INDEX IF NOT EXISTS idx_license_orders_provider_session
  ON license_orders (provider_session_id)
  WHERE provider_session_id IS NOT NULL;
