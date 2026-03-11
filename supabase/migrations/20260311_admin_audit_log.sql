-- Admin Audit Log: centralized tracking of all admin actions for business transparency
-- Captures who did what, to what entity, with full details

CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admin_audit_log_actor ON admin_audit_log(actor_user_id);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX idx_admin_audit_log_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX idx_admin_audit_log_created ON admin_audit_log(created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON admin_audit_log FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert audit logs"
  ON admin_audit_log FOR INSERT
  WITH CHECK (is_admin());
