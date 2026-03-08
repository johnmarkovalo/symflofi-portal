-- ============================================================
-- SymfloFi Cloud — WireGuard Remote Access Columns
-- Adds WireGuard peer info to machines table for remote access
-- ============================================================

ALTER TABLE machines
  ADD COLUMN IF NOT EXISTS wg_public_key TEXT,
  ADD COLUMN IF NOT EXISTS wg_ip INET;

CREATE INDEX idx_machines_wg_ip ON machines(wg_ip) WHERE wg_ip IS NOT NULL;
