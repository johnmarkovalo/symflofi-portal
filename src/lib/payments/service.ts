import { createClient as createServerClient } from "@/lib/supabase/server";
import { getProvider } from "./providers";
import type { WebhookEvent } from "./types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function createPaymentSession(orderId: string, userEmail: string, userName: string) {
  const supabase = await createServerClient();
  const provider = getProvider();

  // Load order
  const { data: order, error: orderErr } = await supabase
    .from("license_orders")
    .select("id, total_price_cents, status, operator_id")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) throw new Error("Order not found");
  if (order.status !== "pending") throw new Error("Order is not pending");

  // Load items for description
  const { data: items } = await supabase
    .from("license_order_items")
    .select("tier_label, quantity")
    .eq("order_id", orderId);

  const description = (items ?? [])
    .map((i) => `${i.quantity}x ${i.tier_label}`)
    .join(", ");

  const result = await provider.createSession({
    orderId,
    amountCents: order.total_price_cents,
    currency: "PHP",
    description: `SymfloFi Licenses: ${description}`,
    customerEmail: userEmail,
    customerName: userName,
    successUrl: `${APP_URL}/payment-return/${orderId}?status=success`,
    failureUrl: `${APP_URL}/payment-return/${orderId}?status=failed`,
  });

  // Persist provider info on the order
  await supabase
    .from("license_orders")
    .update({
      provider: provider.name,
      provider_session_id: result.providerSessionId,
      provider_checkout_url: result.checkoutUrl,
    })
    .eq("id", orderId);

  return { checkoutUrl: result.checkoutUrl };
}

export async function handlePaymentWebhook(headers: Headers, body: unknown) {
  const provider = getProvider();
  const event = await provider.parseWebhook(headers, body);

  await processPaymentEvent(event);
}

export async function pollPaymentStatus(orderId: string) {
  const supabase = await createServerClient();

  const { data: order } = await supabase
    .from("license_orders")
    .select("id, status, provider_session_id")
    .eq("id", orderId)
    .single();

  if (!order) throw new Error("Order not found");

  // Already resolved
  if (order.status !== "pending") {
    return { status: order.status };
  }

  // If we have a provider session, check with them
  if (order.provider_session_id) {
    const provider = getProvider();
    const event = await provider.getSessionStatus(order.provider_session_id);

    if (event.status === "paid") {
      await processPaymentEvent(event);
      return { status: "paid" };
    }

    if (event.status === "expired" || event.status === "failed") {
      await supabase
        .from("license_orders")
        .update({ status: event.status === "expired" ? "cancelled" : "failed" })
        .eq("id", orderId);
      return { status: event.status };
    }
  }

  return { status: "pending" };
}

async function processPaymentEvent(event: WebhookEvent) {
  const supabase = await createServerClient();

  // Find order by provider session ID
  const { data: order } = await supabase
    .from("license_orders")
    .select("id, status, operator_id")
    .eq("provider_session_id", event.providerSessionId)
    .single();

  if (!order) throw new Error(`Order not found for session ${event.providerSessionId}`);

  // Already processed — idempotent
  if (order.status === "paid") return;

  if (event.status === "paid") {
    // Update order with full payment details
    await supabase
      .from("license_orders")
      .update({
        status: "paid",
        payment_method: event.paymentChannel ?? null,
        payment_channel_type: event.paymentChannelType ?? null,
        paid_at: event.paidAt ?? new Date().toISOString(),
        provider_reference_id: event.referenceId ?? null,
        provider_transaction_id: event.transactionId ?? null,
        fee_cents: event.feeCents ?? null,
        net_amount_cents: event.netAmountCents ?? null,
        settlement_status: event.settlementStatus ?? null,
        estimated_settlement_at: event.estimatedSettlementAt ?? null,
        settled_at: event.settledAt ?? null,
        provider_raw: event.raw ?? null,
      })
      .eq("id", order.id);

    // Generate license keys for each line item
    const { data: items } = await supabase
      .from("license_order_items")
      .select("tier_name, quantity")
      .eq("order_id", order.id);

    for (const item of items ?? []) {
      // Look up duration_days from the tier to compute expires_at
      const { data: tier } = await supabase
        .from("license_tiers")
        .select("duration_days")
        .eq("name", item.tier_name)
        .single();

      const durationDays = tier?.duration_days ?? 365;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      await supabase.rpc("generate_license_keys_bulk", {
        p_operator_id: order.operator_id,
        p_tier: item.tier_name,
        p_expires_at: expiresAt.toISOString(),
        p_quantity: item.quantity,
      });
    }
  } else {
    // Failed or expired
    await supabase
      .from("license_orders")
      .update({
        status: event.status === "expired" ? "cancelled" : "failed",
      })
      .eq("id", order.id);
  }
}
