import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { version, board, file_type } = body;

  if (!version || !board || !file_type) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  await supabase.from("firmware_downloads").insert({
    version,
    board,
    file_type,
    ip_address: ip,
    user_agent: userAgent,
  });

  return NextResponse.json({ ok: true });
}
