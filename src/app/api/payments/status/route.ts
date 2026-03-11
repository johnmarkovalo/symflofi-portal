import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pollPaymentStatus } from "@/lib/payments/service";
import { statusLimiter, rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await rateLimit(statusLimiter, user.id);
    if (limited) return limited;

    const orderId = req.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    // Verify ownership
    const { data: operator } = await supabase
      .from("operators")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!operator) {
      return NextResponse.json({ error: "Operator not found" }, { status: 403 });
    }

    const { data: order } = await supabase
      .from("license_orders")
      .select("operator_id")
      .eq("id", orderId)
      .single();

    if (!order || order.operator_id !== operator.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const result = await pollPaymentStatus(orderId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
