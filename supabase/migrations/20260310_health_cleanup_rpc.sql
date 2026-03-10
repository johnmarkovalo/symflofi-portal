-- ============================================================
-- SymfloFi Cloud — Cleanup old machine health snapshots
--
-- Called by the heartbeat Edge Function after each health insert.
-- Keeps only the N most recent snapshots per machine to prevent
-- unbounded table growth (heartbeat fires every 3 minutes).
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_health(
  p_machine_id UUID,
  p_keep INTEGER DEFAULT 100
) RETURNS VOID AS $$
BEGIN
  DELETE FROM machine_health
  WHERE machine_id = p_machine_id
    AND id NOT IN (
      SELECT id FROM machine_health
      WHERE machine_id = p_machine_id
      ORDER BY recorded_at DESC
      LIMIT p_keep
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
