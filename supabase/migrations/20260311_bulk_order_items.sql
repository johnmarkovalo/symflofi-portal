-- Allow bulk order quantities and track distributor package metadata
ALTER TABLE license_order_items DROP CONSTRAINT IF EXISTS license_order_items_quantity_check;
ALTER TABLE license_order_items ADD CONSTRAINT license_order_items_quantity_check CHECK (quantity > 0 AND quantity <= 1000);

-- Track bulk package metadata on line items
ALTER TABLE license_order_items
  ADD COLUMN IF NOT EXISTS distributor_tier_name TEXT,
  ADD COLUMN IF NOT EXISTS bonus_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_pct INTEGER NOT NULL DEFAULT 0;
