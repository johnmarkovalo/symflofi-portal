-- ============================================================================
-- Migration: License Tiers Table
-- Date: 2026-03-09
-- Description: Dynamic license tier pricing (single source of truth)
-- ============================================================================

-- 1. Create license_tiers table
CREATE TABLE IF NOT EXISTS license_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 365,
  max_concurrent_users INTEGER,          -- NULL = unlimited
  max_vouchers_per_month INTEGER,        -- NULL = unlimited
  max_sub_vendos INTEGER NOT NULL DEFAULT 0,
  epayment_enabled BOOLEAN NOT NULL DEFAULT false,
  cloud_dashboard BOOLEAN NOT NULL DEFAULT false,
  remote_access BOOLEAN NOT NULL DEFAULT false,
  pppoe_enabled BOOLEAN NOT NULL DEFAULT false,
  sales_history_days INTEGER NOT NULL DEFAULT 1, -- -1 = unlimited
  ota_channel TEXT NOT NULL DEFAULT 'manual',
  support_level TEXT NOT NULL DEFAULT 'community',
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_highlighted BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Seed default tiers
INSERT INTO license_tiers (name, label, price_cents, duration_days, max_concurrent_users, max_vouchers_per_month, max_sub_vendos, epayment_enabled, cloud_dashboard, remote_access, pppoe_enabled, sales_history_days, ota_channel, support_level, is_public, is_highlighted, sort_order) VALUES
  ('demo',       'Demo',       0,      0,   3,    50,   0, false, false, false, false,   1, 'manual', 'community', true,  false, 1),
  ('lite',       'Lite',       30000,  365, 30,    NULL, 0, false, true,  false, false,  30, 'stable', 'email_48h', true,  false, 2),
  ('pro',        'Pro',        50000,  365, 100,   NULL, 3, true,  true,  true,  true,   -1, 'stable', 'email_24h', true,  true,  3),
  ('enterprise', 'Enterprise', 150000, 365, NULL,  NULL, -1, true, true,  true,  true,   -1, 'all',    'priority',  true,  false, 4)
ON CONFLICT (name) DO NOTHING;

-- 3. RLS for license_tiers
ALTER TABLE license_tiers ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_full_license_tiers" ON license_tiers
  FOR ALL USING ((SELECT is_admin()));

-- Public read: anyone can read public tiers (for landing page)
CREATE POLICY "public_read_license_tiers" ON license_tiers
  FOR SELECT USING (true);
