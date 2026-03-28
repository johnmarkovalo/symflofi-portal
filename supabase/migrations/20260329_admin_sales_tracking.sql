-- ============================================================================
-- Migration: Admin Sales Tracking (Direct Purchase + Credit System)
-- Date: 2026-03-29
-- Description: Extend license_orders for admin-generated sales, add credit
--              payment tracking. Enables revenue tracking for direct purchases
--              and credit sales made outside the online store.
-- ============================================================================

-- 1. Add source column to distinguish online vs admin orders
ALTER TABLE license_orders ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'online';

-- 2. Add admin sale tracking columns
ALTER TABLE license_orders ADD COLUMN IF NOT EXISTS discount_pct INTEGER DEFAULT 0;
ALTER TABLE license_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE license_orders ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE license_orders ADD COLUMN IF NOT EXISTS amount_paid_cents INTEGER DEFAULT 0;

-- 3. Expand status constraint to include credit and partially_paid
ALTER TABLE license_orders DROP CONSTRAINT IF EXISTS license_orders_status_check;
ALTER TABLE license_orders ADD CONSTRAINT license_orders_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'credit', 'partially_paid'));

-- 4. Backfill: existing paid orders have full amount paid
UPDATE license_orders
  SET amount_paid_cents = total_price_cents
  WHERE status = 'paid' AND amount_paid_cents = 0;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_license_orders_source ON license_orders(source);
CREATE INDEX IF NOT EXISTS idx_license_orders_status ON license_orders(status);

-- 6. Credit payments ledger
CREATE TABLE IF NOT EXISTS credit_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES license_orders(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  payment_method TEXT NOT NULL,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_payments_order ON credit_payments(order_id);

-- 7. RLS for credit_payments
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_credit_payments" ON credit_payments
  FOR ALL USING (is_admin());

CREATE POLICY "operator_read_own_credit_payments" ON credit_payments
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM license_orders
      WHERE operator_id IN (
        SELECT id FROM operators WHERE auth_user_id = auth.uid()
      )
    )
  );
