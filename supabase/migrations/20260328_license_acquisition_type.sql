-- ============================================================================
-- Migration: License Acquisition Type Tracking
-- Date: 2026-03-28
-- Description: Add acquisition_type column to license_keys to track how
--              licenses were acquired (online purchase, direct purchase, credit).
--              Update generate_license_key and generate_license_keys_bulk RPCs.
-- ============================================================================

-- 1. Add acquisition_type column
ALTER TABLE license_keys
  ADD COLUMN IF NOT EXISTS acquisition_type TEXT
  CHECK (acquisition_type IN ('online_purchase', 'direct_purchase', 'credit'));

-- 2. Backfill: keys with an order_id are online purchases
UPDATE license_keys SET acquisition_type = 'online_purchase' WHERE order_id IS NOT NULL AND acquisition_type IS NULL;

-- 3. Index for filtering/reporting
CREATE INDEX IF NOT EXISTS idx_license_keys_acquisition_type ON license_keys(acquisition_type);

-- 4. Update generate_license_key to accept acquisition_type
CREATE OR REPLACE FUNCTION generate_license_key(
  p_operator_id UUID DEFAULT NULL,
  p_tier TEXT DEFAULT 'lite',
  p_duration_days INTEGER DEFAULT 365,
  p_product TEXT DEFAULT 'symflofi',
  p_acquisition_type TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result TEXT;
  i INTEGER;
  seg INTEGER;
BEGIN
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

  result := prefix || '-';
  FOR seg IN 1..3 LOOP
    FOR i IN 1..4 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    IF seg < 3 THEN result := result || '-'; END IF;
  END LOOP;

  INSERT INTO license_keys (key, tier, operator_id, duration_days, product, acquisition_type)
  VALUES (result, p_tier, p_operator_id, p_duration_days, p_product, p_acquisition_type);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update generate_license_keys_bulk to accept acquisition_type
CREATE OR REPLACE FUNCTION generate_license_keys_bulk(
  p_operator_id UUID,
  p_tier TEXT,
  p_expires_at TIMESTAMPTZ,
  p_quantity INTEGER,
  p_request_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_product TEXT DEFAULT 'symflofi',
  p_acquisition_type TEXT DEFAULT NULL
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

  RETURN QUERY
  INSERT INTO license_keys (key, tier, operator_id, duration_days, request_id, order_id, product, acquisition_type)
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
    p_product,
    p_acquisition_type
  FROM generate_series(1, p_quantity)
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
