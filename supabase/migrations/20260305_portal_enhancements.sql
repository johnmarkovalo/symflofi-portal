-- ============================================================
-- SymfloFi Cloud Portal Enhancements — Phase 1
-- ============================================================

-- 1. License Requests (operator → admin approval workflow)
CREATE TABLE license_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id),
  tier TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  duration_months INTEGER NOT NULL DEFAULT 12,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Activity Log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES operators(id),
  machine_id UUID REFERENCES machines(id),
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Machine Health Snapshots
CREATE TABLE machine_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id),
  cpu_percent DECIMAL(5,2),
  ram_percent DECIMAL(5,2),
  disk_percent DECIMAL(5,2),
  temperature DECIMAL(5,1),
  uptime_secs INTEGER,
  connected_clients INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add request_id to license_keys for traceability (Request → Keys → Machines)
ALTER TABLE license_keys ADD COLUMN request_id UUID REFERENCES license_requests(id);
CREATE INDEX idx_license_keys_request ON license_keys(request_id);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_license_requests_operator ON license_requests(operator_id);
CREATE INDEX idx_license_requests_status ON license_requests(status);
CREATE INDEX idx_activity_log_operator ON activity_log(operator_id);
CREATE INDEX idx_activity_log_machine ON activity_log(machine_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_machine_health_machine ON machine_health(machine_id);
CREATE INDEX idx_machine_health_recorded ON machine_health(recorded_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE license_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_health ENABLE ROW LEVEL SECURITY;

-- license_requests: admins see all, operators see own
CREATE POLICY "Admins can manage all license requests"
  ON license_requests FOR ALL
  USING (is_admin());

CREATE POLICY "Operators can view own license requests"
  ON license_requests FOR SELECT
  USING (operator_id IN (
    SELECT id FROM operators WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Operators can insert own license requests"
  ON license_requests FOR INSERT
  WITH CHECK (operator_id IN (
    SELECT id FROM operators WHERE auth_user_id = auth.uid()
  ));

-- activity_log: admins see all, operators see own
CREATE POLICY "Admins can manage all activity logs"
  ON activity_log FOR ALL
  USING (is_admin());

CREATE POLICY "Operators can view own activity logs"
  ON activity_log FOR SELECT
  USING (
    operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())
    OR machine_id IN (
      SELECT m.id FROM machines m
      JOIN operators o ON m.operator_id = o.id
      WHERE o.auth_user_id = auth.uid()
    )
  );

-- machine_health: admins see all, operators see own machines
CREATE POLICY "Admins can manage all machine health"
  ON machine_health FOR ALL
  USING (is_admin());

CREATE POLICY "Operators can view own machine health"
  ON machine_health FOR SELECT
  USING (machine_id IN (
    SELECT m.id FROM machines m
    JOIN operators o ON m.operator_id = o.id
    WHERE o.auth_user_id = auth.uid()
  ));

-- ============================================================
-- Bulk License Generation RPC
-- ============================================================
CREATE OR REPLACE FUNCTION generate_license_keys_bulk(
  p_operator_id UUID,
  p_tier TEXT,
  p_expires_at TIMESTAMPTZ,
  p_quantity INTEGER,
  p_request_id UUID DEFAULT NULL
) RETURNS SETOF license_keys AS $$
DECLARE
  i INTEGER;
  result license_keys;
BEGIN
  IF p_quantity < 1 OR p_quantity > 100 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 100';
  END IF;

  FOR i IN 1..p_quantity LOOP
    SELECT * INTO result FROM generate_license_key(p_operator_id, p_tier, p_expires_at);
    IF p_request_id IS NOT NULL THEN
      UPDATE license_keys SET request_id = p_request_id WHERE id = result.id;
      result.request_id := p_request_id;
    END IF;
    RETURN NEXT result;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
