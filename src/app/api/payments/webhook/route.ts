import { NextRequest, NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/lib/payments/service";
import { webhookLimiter, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const limited = await rateLimit(webhookLimiter, ip);
    if (limited) return limited;
    const body = await req.json();
    await handlePaymentWebhook(req.headers, body);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Payment webhook error:", err);
    // Always return 200 to prevent retries on validation errors
    // Real failures (network, DB) will throw and return 500
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    if (message === "Invalid webhook token") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
