-- Track whether keys were successfully generated (allows safe retries on failure)
ALTER TABLE license_orders
  ADD COLUMN IF NOT EXISTS keys_generated BOOLEAN NOT NULL DEFAULT false;
