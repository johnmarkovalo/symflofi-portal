"use server";

import { createClient } from "@/lib/supabase/server";
import type { UserContext } from "@/lib/roles";

type AuditEntry = {
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  details?: Record<string, unknown>;
};

export async function logAdminAction(ctx: UserContext, entry: AuditEntry) {
  if (!ctx || ctx.role !== "admin") return;

  try {
    const supabase = await createClient();
    await supabase.from("admin_audit_log").insert({
      actor_user_id: ctx.userId,
      actor_email: ctx.email,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      summary: entry.summary,
      details: entry.details ?? null,
    });
  } catch {
    // Audit logging should never block the primary action
    console.error("Failed to write audit log");
  }
}
