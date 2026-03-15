-- ============================================================================
-- Migration: Multi-product support for bulk key generation
-- Date: 2026-03-15
-- Description: Updates generate_license_keys_bulk to support PlayTab and
--              SymfloKiosk product prefixes
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_license_keys_bulk(
  p_operator_id UUID,
  p_tier TEXT,
  p_expires_at TIMESTAMPTZ,
  p_quantity INTEGER,
  p_request_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_product TEXT DEFAULT 'symflofi'
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

  IF p_product = 'playtab' THEN
    CASE p_tier
      WHEN 'playtab_lite' THEN prefix := 'PTLI';
      WHEN 'playtab_pro' THEN prefix := 'PTPR';
      WHEN 'playtab_business' THEN prefix := 'PTBS';
      ELSE prefix := 'PTLI';
    END CASE;
  ELSIF p_product = 'symflokiosk' THEN
    CASE p_tier
      WHEN 'lite' THEN prefix := 'SKLI';
      WHEN 'pro' THEN prefix := 'SKPR';
      WHEN 'enterprise' THEN prefix := 'SKEN';
      ELSE prefix := 'SKTR';
    END CASE;
  ELSE
    CASE p_tier
      WHEN 'lite' THEN prefix := 'SFLI';
      WHEN 'pro' THEN prefix := 'SFPR';
      WHEN 'enterprise' THEN prefix := 'SFEN';
      ELSE prefix := 'SFTR';
    END CASE;
  END IF;

  duration := CASE
    WHEN p_expires_at IS NOT NULL THEN EXTRACT(DAY FROM p_expires_at - now())::INTEGER
    ELSE 365
  END;

  -- Generate all keys in a single batch INSERT
  -- Each key: PREFIX-XXXX-XXXX-XXXX (4 random chars per segment, 3 segments)
  RETURN QUERY
  INSERT INTO license_keys (key, tier, operator_id, duration_days, request_id, order_id, product)
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
    p_order_id,
    p_product
  FROM generate_series(1, p_quantity)
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
