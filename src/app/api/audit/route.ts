import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { apiLimiter, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const limited = await rateLimit(apiLimiter, ctx.userId);
  if (limited) return limited;

  try {
    const body = await req.json();
    const { action, entityType, entityId, summary, details } = body;

    if (!action || !entityType || !summary) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    await supabase.from("admin_audit_log").insert({
      actor_user_id: ctx.userId,
      actor_email: ctx.email,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      summary,
      details: details ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to log audit entry" }, { status: 500 });
  }
}
