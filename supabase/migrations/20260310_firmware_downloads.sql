-- Track firmware download events for analytics
CREATE TABLE IF NOT EXISTS firmware_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  board TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'update')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- No RLS needed — inserts go through API route, reads are admin-only
ALTER TABLE firmware_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_downloads" ON firmware_downloads
  FOR SELECT USING ((SELECT is_admin()));

-- Service role can insert (from API route)
CREATE POLICY "service_insert_downloads" ON firmware_downloads
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_firmware_downloads_created ON firmware_downloads (created_at);
CREATE INDEX IF NOT EXISTS idx_firmware_downloads_version ON firmware_downloads (version);
