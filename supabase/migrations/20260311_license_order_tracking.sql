-- Add order_id to license_keys for purchase order traceability
ALTER TABLE license_keys
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES license_orders(id);

CREATE INDEX IF NOT EXISTS idx_license_keys_order ON license_keys (order_id);

-- Update bulk generation RPC to accept order_id and raise quantity limit for bulk packages
CREATE OR REPLACE FUNCTION generate_license_keys_bulk(
  p_operator_id UUID,
  p_tier TEXT,
  p_expires_at TIMESTAMPTZ,
  p_quantity INTEGER,
  p_request_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL
) RETURNS SETOF license_keys AS $$
DECLARE
  i INTEGER;
  result license_keys;
BEGIN
  IF p_quantity < 1 OR p_quantity > 1000 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 1000';
  END IF;

  FOR i IN 1..p_quantity LOOP
    SELECT * INTO result FROM generate_license_key(p_operator_id, p_tier, p_expires_at);
    IF p_request_id IS NOT NULL THEN
      UPDATE license_keys SET request_id = p_request_id WHERE id = result.id;
      result.request_id := p_request_id;
    END IF;
    IF p_order_id IS NOT NULL THEN
      UPDATE license_keys SET order_id = p_order_id WHERE id = result.id;
      result.order_id := p_order_id;
    END IF;
    RETURN NEXT result;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
