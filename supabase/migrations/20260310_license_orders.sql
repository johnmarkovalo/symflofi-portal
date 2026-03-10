-- License orders with line items for multi-tier cart checkout
CREATE TABLE IF NOT EXISTS license_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id),
  total_price_cents INTEGER NOT NULL CHECK (total_price_cents >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS license_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES license_orders(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  tier_label TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 50),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE license_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_order_items ENABLE ROW LEVEL SECURITY;

-- Operators can manage their own orders
CREATE POLICY "operators_own_orders" ON license_orders
  FOR ALL USING (
    operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())
  );

-- Order items follow parent order access
CREATE POLICY "operators_own_order_items" ON license_order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM license_orders
      WHERE operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())
    )
  );

-- Admin full access
CREATE POLICY "admin_all_orders" ON license_orders
  FOR ALL USING ((SELECT is_admin()));

CREATE POLICY "admin_all_order_items" ON license_order_items
  FOR ALL USING ((SELECT is_admin()));

CREATE INDEX IF NOT EXISTS idx_license_orders_operator ON license_orders (operator_id);
CREATE INDEX IF NOT EXISTS idx_license_orders_status ON license_orders (status);
CREATE INDEX IF NOT EXISTS idx_license_order_items_order ON license_order_items (order_id);
