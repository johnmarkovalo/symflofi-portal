-- ============================================================================
-- Launch Day Reset
-- Date: 2026-03-28
-- Description: Clears all transactional/test data while preserving:
--   - auth.users (admin & operator accounts)
--   - operators (operator profiles & distributor status)
--   - license_tiers (tier definitions & pricing)
--   - distributor_tiers (distributor tier definitions)
--
-- Run this in Supabase SQL Editor as a single transaction.
-- ============================================================================

BEGIN;

-- 1. Audit & activity logs (no FK dependencies)
TRUNCATE TABLE admin_audit_log CASCADE;
TRUNCATE TABLE license_audit_log CASCADE;
TRUNCATE TABLE machine_audit_log CASCADE;
TRUNCATE TABLE activity_log CASCADE;

-- 2. PlayTab data
TRUNCATE TABLE playtab_daily_revenue CASCADE;
TRUNCATE TABLE playtab_sessions CASCADE;

-- 3. Credit payments (depends on license_orders)
TRUNCATE TABLE credit_payments CASCADE;

-- 4. Transfer OTPs
TRUNCATE TABLE transfer_otps CASCADE;

-- 5. Machine health (depends on machines)
TRUNCATE TABLE machine_health CASCADE;

-- 6. Firmware downloads
TRUNCATE TABLE firmware_downloads CASCADE;

-- 7. License keys (depends on machines, operators, license_orders, license_requests)
TRUNCATE TABLE license_keys CASCADE;

-- 8. Machines (depends on operators)
TRUNCATE TABLE machines CASCADE;

-- 9. License requests (depends on operators)
TRUNCATE TABLE license_requests CASCADE;

-- 10. Order items (depends on license_orders)
TRUNCATE TABLE license_order_items CASCADE;

-- 11. Orders (depends on operators)
TRUNCATE TABLE license_orders CASCADE;

-- Reset distributor purchase counts on operators (since licenses are wiped)
-- but keep their accounts and profiles intact
UPDATE operators SET
  is_distributor = false,
  distributor_tier = NULL,
  distributor_discount_pct = 0;

COMMIT;

-- Verify: these should all return 0
SELECT 'license_keys' AS tbl, COUNT(*) FROM license_keys
UNION ALL SELECT 'machines', COUNT(*) FROM machines
UNION ALL SELECT 'license_orders', COUNT(*) FROM license_orders
UNION ALL SELECT 'license_requests', COUNT(*) FROM license_requests
UNION ALL SELECT 'credit_payments', COUNT(*) FROM credit_payments;

-- Verify: these should still have data
SELECT 'operators' AS tbl, COUNT(*) FROM operators
UNION ALL SELECT 'license_tiers', COUNT(*) FROM license_tiers
UNION ALL SELECT 'distributor_tiers', COUNT(*) FROM distributor_tiers;
