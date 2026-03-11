-- Replace loop-based bulk generation with single batch INSERT
CREATE OR REPLACE FUNCTION generate_license_keys_bulk(
  p_operator_id UUID,
  p_tier TEXT,
  p_expires_at TIMESTAMPTZ,
  p_quantity INTEGER,
  p_request_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL
) RETURNS SETOF license_keys AS $$
DECLARE
  prefix TEXT;
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  chars_len INTEGER := 30;
  duration INTEGER;
BEGIN
  IF p_quantity < 1 OR p_quantity > 1000 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 1000';
  END IF;

  CASE p_tier
    WHEN 'lite' THEN prefix := 'SFLI';
    WHEN 'pro' THEN prefix := 'SFPR';
    WHEN 'enterprise' THEN prefix := 'SFEN';
    ELSE prefix := 'SFTR';
  END CASE;

  duration := CASE
    WHEN p_expires_at IS NOT NULL THEN EXTRACT(DAY FROM p_expires_at - now())::INTEGER
    ELSE 365
  END;

  -- Generate all keys in a single batch INSERT
  -- Each key: PREFIX-XXXX-XXXX-XXXX (4 random chars per segment, 3 segments)
  RETURN QUERY
  INSERT INTO license_keys (key, tier, operator_id, duration_days, request_id, order_id)
  SELECT
    prefix || '-' ||
    substr(chars, floor(random() * chars_len + 1)::int, 1) ||
    substr(chars, floor(random() * chars_len + 1)::int, 1) ||
    substr(chars, floor(random() * chars_len + 1)::int, 1) ||
    substr(chars, floor(random() * chars_len + 1)::int, 1) || '-' ||
    substr(chars, floor(random() * chars_len + 1)::int, 1) ||
    substr(chars, floor(random() * chars_len + 1)::int, 1) ||
    substr(chars, floor(random() * chars_len + 1)::int, 1) ||
    substr(chars, floor(random() * chars_len + 1)::int, 1) || '-' ||
    substr(chars, floor(random() * chars_len + 1)::int, 1) ||
    substr(chars, floor(random() * chars_len + 1)::int, 1) ||
    substr(chars, floor(random() * chars_len + 1)::int, 1) ||
    substr(chars, floor(random() * chars_len + 1)::int, 1),
    p_tier,
    p_operator_id,
    duration,
    p_request_id,
    p_order_id
  FROM generate_series(1, p_quantity)
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
