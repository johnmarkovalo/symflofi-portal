-- Add ip_address column to machines table for WAN IP reporting
ALTER TABLE machines ADD COLUMN IF NOT EXISTS ip_address TEXT;
