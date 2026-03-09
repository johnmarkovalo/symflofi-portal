-- Unique operator code for public identification and license transfers
-- Format: SYMF-XX99-XXXX-XXXX where first segment has 2 letters from email

-- Add the column
ALTER TABLE operators ADD COLUMN IF NOT EXISTS operator_code TEXT UNIQUE;

-- Function to generate an operator code from email
CREATE OR REPLACE FUNCTION generate_operator_code(op_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  prefix TEXT;
  seg2 TEXT;
  seg3 TEXT;
  candidate TEXT;
  attempts INT := 0;
BEGIN
  -- Extract first 2 alpha chars from email username (before @), uppercase
  prefix := upper(substring(regexp_replace(split_part(op_email, '@', 1), '[^a-zA-Z]', '', 'g') FROM 1 FOR 2));
  -- Pad with 'X' if email has fewer than 2 alpha chars
  prefix := rpad(coalesce(nullif(prefix, ''), 'XX'), 2, 'X');

  LOOP
    -- Build: SYMF-[2 letters][2 digits]-[4 alphanum]-[4 alphanum]
    seg2 := prefix || lpad(floor(random() * 100)::text, 2, '0');
    seg3 := upper(substr(md5(random()::text), 1, 4));
    candidate := 'SYMF-' || seg2 || '-' || upper(substr(md5(random()::text), 1, 4)) || '-' || seg3;

    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM operators WHERE operator_code = candidate) THEN
      RETURN candidate;
    END IF;

    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique operator code after 100 attempts';
    END IF;
  END LOOP;
END;
$$;

-- Trigger to auto-generate code on insert if not provided
CREATE OR REPLACE FUNCTION set_operator_code()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.operator_code IS NULL THEN
    NEW.operator_code := generate_operator_code(COALESCE(NEW.email, 'unknown@x.com'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_operator_code ON operators;
CREATE TRIGGER trg_set_operator_code
  BEFORE INSERT ON operators
  FOR EACH ROW
  EXECUTE FUNCTION set_operator_code();

-- Backfill existing operators that don't have a code
DO $$
DECLARE
  op RECORD;
BEGIN
  FOR op IN SELECT id, email FROM operators WHERE operator_code IS NULL
  LOOP
    UPDATE operators
    SET operator_code = generate_operator_code(COALESCE(op.email, 'unknown@x.com'))
    WHERE id = op.id;
  END LOOP;
END;
$$;

-- Make it NOT NULL after backfill
ALTER TABLE operators ALTER COLUMN operator_code SET NOT NULL;

-- Index for fast lookup during transfers
CREATE INDEX IF NOT EXISTS idx_operators_operator_code ON operators (operator_code);
