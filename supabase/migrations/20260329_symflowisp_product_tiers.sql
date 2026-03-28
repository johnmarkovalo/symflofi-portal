-- ============================================================================
-- Migration: SymfloWISP Product Tiers
-- Date: 2026-03-29
-- Description: Adds SymfloWISP (WISP OS) license tiers as a separate product.
--              Same firmware image, different license key determines product.
--              ADDITIVE ONLY — does not modify existing symflofi or playtab tiers.
--
-- Products in system:
--   symflofi   = Piso WiFi vendo firmware (existing)
--   playtab    = PlayTab gaming kiosk (existing)
--   symflowisp = WISP/ISP operating system (NEW)
-- ============================================================================

-- 1. Remove uniqueness constraint on name if it exists (name is unique per product, not globally)
-- The original table had UNIQUE on name alone. We need name+product to be unique.
-- Check if the constraint exists before trying to drop it.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'license_tiers_name_key'
    AND conrelid = 'license_tiers'::regclass
  ) THEN
    ALTER TABLE license_tiers DROP CONSTRAINT license_tiers_name_key;
  END IF;
END $$;

-- Add composite unique constraint (name + product) if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'license_tiers_name_product_key'
    AND conrelid = 'license_tiers'::regclass
  ) THEN
    ALTER TABLE license_tiers ADD CONSTRAINT license_tiers_name_product_key UNIQUE (name, product);
  END IF;
END $$;

-- 2. Insert SymfloWISP tiers
-- These are completely separate from symflofi tiers.
-- Pricing: Starter ₱15,000/yr, Business ₱25,000/yr, Enterprise ₱50,000/yr

INSERT INTO license_tiers (
  name, label, price_cents, duration_days,
  max_concurrent_users, max_vouchers_per_month, max_sub_vendos,
  epayment_enabled, cloud_dashboard, remote_access, pppoe_enabled,
  sales_history_days, ota_channel, support_level,
  is_public, is_highlighted, sort_order,
  product, features,
  vlan_enabled, max_vlans, session_roaming,
  theme_customization, max_subscribers,
  radius_enabled, snmp_enabled, spinwheel_enabled,
  mwan_enabled, promo_rates_enabled, sub_accounts_enabled, eloading_enabled
) VALUES
-- SymfloWISP Starter: ₱15,000/yr, 50 subs, 2 VLANs, no RADIUS
(
  'starter', 'Starter', 1500000, 365,
  NULL, NULL, 0,
  false, true, true, true,
  -1, 'stable', 'email_48h',
  true, false, 1,
  'symflowisp',
  '{"pppoe_enabled":true,"vlan_enabled":true,"max_vlans":2,"remote_access":true,"cloud_dashboard":true,"snmp_enabled":false,"radius_enabled":false,"mwan_enabled":true,"max_subscribers":50}'::jsonb,
  true, 2, false,
  false, 50,
  false, false, false,
  true, false, false, false
),
-- SymfloWISP Business: ₱25,000/yr, 200 subs, 10 VLANs, SNMP, sub-accounts
(
  'business', 'Business', 2500000, 365,
  NULL, NULL, 0,
  false, true, true, true,
  -1, 'stable', 'email_24h',
  true, true, 2,
  'symflowisp',
  '{"pppoe_enabled":true,"vlan_enabled":true,"max_vlans":10,"remote_access":true,"cloud_dashboard":true,"snmp_enabled":true,"radius_enabled":false,"mwan_enabled":true,"sub_accounts_enabled":true,"max_subscribers":200}'::jsonb,
  true, 10, false,
  false, 200,
  false, true, false,
  true, true, true, false
),
-- SymfloWISP Enterprise: ₱50,000/yr, unlimited subs, unlimited VLANs, RADIUS, everything
(
  'enterprise', 'Enterprise', 5000000, 365,
  NULL, NULL, -1,
  false, true, true, true,
  -1, 'all', 'priority',
  true, false, 3,
  'symflowisp',
  '{"pppoe_enabled":true,"vlan_enabled":true,"max_vlans":-1,"remote_access":true,"cloud_dashboard":true,"snmp_enabled":true,"radius_enabled":true,"mwan_enabled":true,"sub_accounts_enabled":true,"promo_rates_enabled":true,"max_subscribers":-1}'::jsonb,
  true, -1, false,
  false, -1,
  true, true, false,
  true, true, true, false
)
ON CONFLICT ON CONSTRAINT license_tiers_name_product_key DO UPDATE SET
  label = EXCLUDED.label,
  price_cents = EXCLUDED.price_cents,
  duration_days = EXCLUDED.duration_days,
  max_concurrent_users = EXCLUDED.max_concurrent_users,
  max_vouchers_per_month = EXCLUDED.max_vouchers_per_month,
  max_sub_vendos = EXCLUDED.max_sub_vendos,
  epayment_enabled = EXCLUDED.epayment_enabled,
  cloud_dashboard = EXCLUDED.cloud_dashboard,
  remote_access = EXCLUDED.remote_access,
  pppoe_enabled = EXCLUDED.pppoe_enabled,
  sales_history_days = EXCLUDED.sales_history_days,
  ota_channel = EXCLUDED.ota_channel,
  support_level = EXCLUDED.support_level,
  is_public = EXCLUDED.is_public,
  is_highlighted = EXCLUDED.is_highlighted,
  sort_order = EXCLUDED.sort_order,
  features = EXCLUDED.features,
  vlan_enabled = EXCLUDED.vlan_enabled,
  max_vlans = EXCLUDED.max_vlans,
  session_roaming = EXCLUDED.session_roaming,
  theme_customization = EXCLUDED.theme_customization,
  max_subscribers = EXCLUDED.max_subscribers,
  radius_enabled = EXCLUDED.radius_enabled,
  snmp_enabled = EXCLUDED.snmp_enabled,
  spinwheel_enabled = EXCLUDED.spinwheel_enabled,
  mwan_enabled = EXCLUDED.mwan_enabled,
  promo_rates_enabled = EXCLUDED.promo_rates_enabled,
  sub_accounts_enabled = EXCLUDED.sub_accounts_enabled,
  eloading_enabled = EXCLUDED.eloading_enabled,
  updated_at = now();

-- 3. Verify: list all tiers by product
-- SELECT name, label, product, price_cents, max_subscribers, radius_enabled, snmp_enabled
-- FROM license_tiers ORDER BY product, sort_order;
