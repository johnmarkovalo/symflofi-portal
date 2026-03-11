-- Performance indexes for production scale
-- Covers all high-frequency query patterns missing indexes

-- operators: auth_user_id is looked up on EVERY page load (getUserContext)
CREATE INDEX IF NOT EXISTS idx_operators_auth_user_id ON operators (auth_user_id);

-- operators: distributor directory filters on these together
CREATE INDEX IF NOT EXISTS idx_operators_distributor ON operators (is_distributor) WHERE is_distributor = true;

-- license_keys: operator_id filtered in 10+ queries (licenses page, dashboard, etc.)
CREATE INDEX IF NOT EXISTS idx_license_keys_operator ON license_keys (operator_id);

-- license_keys: key lookup used in validate_license RPC (every device check-in)
CREATE UNIQUE INDEX IF NOT EXISTS idx_license_keys_key ON license_keys (key);

-- license_keys: composite for dashboard counts (operator's activated/available)
CREATE INDEX IF NOT EXISTS idx_license_keys_operator_activated ON license_keys (operator_id, is_activated);

-- license_keys: created_at for sorting + expiry calculations
CREATE INDEX IF NOT EXISTS idx_license_keys_created ON license_keys (created_at DESC);

-- machines: operator_id filtered in 5+ queries (machines page, dashboard)
CREATE INDEX IF NOT EXISTS idx_machines_operator ON machines (operator_id);

-- machines: machine_uuid used in validate_license upsert (every device check-in)
CREATE UNIQUE INDEX IF NOT EXISTS idx_machines_uuid ON machines (machine_uuid);

-- machines: last_seen_at for sorting + online/offline status checks
CREATE INDEX IF NOT EXISTS idx_machines_last_seen ON machines (last_seen_at DESC NULLS LAST);

-- machines: composite for operator's online/offline dashboard query
CREATE INDEX IF NOT EXISTS idx_machines_operator_last_seen ON machines (operator_id, last_seen_at DESC NULLS LAST);

-- license_tiers: name lookup (used in price verification, key generation)
CREATE UNIQUE INDEX IF NOT EXISTS idx_license_tiers_name ON license_tiers (name);
