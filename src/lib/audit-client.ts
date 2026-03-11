export async function logAdminActionClient(entry: {
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  details?: Record<string, unknown>;
}) {
  try {
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch {
    // Audit logging should never block the UI
  }
}
