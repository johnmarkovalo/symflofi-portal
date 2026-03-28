-- ============================================================================
-- Migration: Machine Notes & Customer Name
-- Date: 2026-03-28
-- Description: Add notes and customer_name columns to machines table so
--              distributors can track end-customers who don't have accounts.
-- ============================================================================

ALTER TABLE machines ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS customer_name TEXT;
