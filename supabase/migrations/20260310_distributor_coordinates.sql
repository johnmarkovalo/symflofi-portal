-- Add latitude/longitude to operators for distributor map pins
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
