-- ============================================================================
-- Migration: Update PlayTab tier features with new capabilities
-- Date: 2026-03-26
-- Description: Add deep_freeze, app_whitelisting, theming, kiosk_mode,
--              ota_updates to PlayTab tier features JSONB.
-- ============================================================================

-- PlayTab Lite: basic kiosk, no advanced features
UPDATE license_tiers SET features = features || '{
  "kiosk_mode": true,
  "app_whitelisting": false,
  "deep_freeze": false,
  "theming": false,
  "ota_updates": false
}'::jsonb
WHERE product = 'playtab' AND name = 'playtab_lite';

-- PlayTab Pro: full kiosk features
UPDATE license_tiers SET features = features || '{
  "kiosk_mode": true,
  "app_whitelisting": true,
  "deep_freeze": true,
  "theming": true,
  "ota_updates": true
}'::jsonb
WHERE product = 'playtab' AND name = 'playtab_pro';

-- PlayTab Business: everything Pro has + more
UPDATE license_tiers SET features = features || '{
  "kiosk_mode": true,
  "app_whitelisting": true,
  "deep_freeze": true,
  "theming": true,
  "ota_updates": true
}'::jsonb
WHERE product = 'playtab' AND name = 'playtab_business';
