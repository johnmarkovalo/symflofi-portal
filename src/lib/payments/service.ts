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

  // Load line items with full details
  const { data: items } = await supabase
    .from("license_order_items")
    .select("tier_name, tier_label, quantity, bonus_quantity, discount_pct")
    .eq("order_id", orderId);

  if (!items || items.length === 0) throw new Error("Order has no items");

  // Load operator's distributor discount
  const { data: operator } = await supabase
    .from("operators")
    .select("is_distributor, distributor_discount_pct")
    .eq("id", order.operator_id)
    .single();

  const operatorDiscountPct = (operator?.is_distributor && operator.distributor_discount_pct > 0)
    ? operator.distributor_discount_pct
    : 0;

  // Load all referenced license tier prices
  const tierNames = [...new Set(items.map((i) => i.tier_name))];
  const { data: tiers } = await supabase
    .from("license_tiers")
    .select("name, price_cents")
    .in("name", tierNames);

  const tierPriceMap = new Map((tiers ?? []).map((t) => [t.name, t.price_cents]));

  // Recompute total server-side from line items and actual DB prices
  let verifiedTotal = 0;
  for (const item of items) {
    const basePriceCents = tierPriceMap.get(item.tier_name);
    if (basePriceCents === undefined) throw new Error(`Unknown tier: ${item.tier_name}`);

    const isBulk = (item.bonus_quantity ?? 0) > 0;
    if (isBulk) {
      // Bulk package: discount applies to paid keys only (total - bonus)
      const paidQty = item.quantity - (item.bonus_quantity ?? 0);
      const discountedUnit = Math.round(basePriceCents * (1 - operatorDiscountPct / 100));
      verifiedTotal += discountedUnit * paidQty;
    } else {
      // Individual: operator discount applies per unit
      const discountedUnit = operatorDiscountPct > 0
        ? Math.round(basePriceCents * (1 - operatorDiscountPct / 100))
        : basePriceCents;
      verifiedTotal += discountedUnit * item.quantity;
    }
  }

  // Reject if client-submitted total doesn't match server-computed total
  if (order.total_price_cents !== verifiedTotal) {
    // Update the order with the correct total
    await supabase
      .from("license_orders")
      .update({ total_price_cents: verifiedTotal })
      .eq("id", orderId);
  }

  const description = (items ?? [])
    .map((i) => `${i.quantity}x ${i.tier_label}`)
    .join(", ");

  const result = await provider.createSession({
    orderId,
    amountCents: verifiedTotal,
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

export async function handlePaymentWebhook(headers: Headers, body: unknown, rawBody?: string) {
  const provider = getProvider();
  const event = await provider.parseWebhook(headers, body, rawBody);

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
    .select("id, status, operator_id, keys_generated")
    .eq("provider_session_id", event.providerSessionId)
    .single();

  if (!order) throw new Error(`Order not found for session ${event.providerSessionId}`);

  // Fully processed — idempotent
  if (order.status === "paid" && order.keys_generated) return;

  if (event.status === "paid") {
    // If keys not yet generated (handles both fresh payments and retries)
    if (!order.keys_generated) {
      const { data: items } = await supabase
        .from("license_order_items")
        .select("tier_name, quantity")
        .eq("order_id", order.id);

      if (!items || items.length === 0) {
        throw new Error(`No line items found for order ${order.id}`);
      }

      const expectedTotal = items.reduce((sum, i) => sum + i.quantity, 0);

      // Check how many keys already exist for this order (from a partial previous attempt)
      const { count: existingCount } = await supabase
        .from("license_keys")
        .select("id", { count: "exact", head: true })
        .eq("order_id", order.id);

      if ((existingCount ?? 0) < expectedTotal) {
        // Figure out how many keys exist per tier to know what's remaining
        for (const item of items) {
          const { count: tierCount } = await supabase
            .from("license_keys")
            .select("id", { count: "exact", head: true })
            .eq("order_id", order.id)
            .eq("tier", item.tier_name);

          const remaining = item.quantity - (tierCount ?? 0);
          if (remaining <= 0) continue;

          const { data: tier } = await supabase
            .from("license_tiers")
            .select("duration_days, product")
            .eq("name", item.tier_name)
            .single();

          const durationDays = tier?.duration_days ?? 365;
          const tierProduct = tier?.product ?? (item.tier_name.startsWith("playtab_") ? "playtab" : "symflofi");
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + durationDays);

          const { error: rpcError } = await supabase.rpc("generate_license_keys_bulk", {
            p_operator_id: order.operator_id,
            p_tier: item.tier_name,
            p_expires_at: expiresAt.toISOString(),
            p_quantity: remaining,
            p_order_id: order.id,
            p_product: tierProduct,
          });

          if (rpcError) {
            throw new Error(`Failed to generate ${remaining}x ${item.tier_name} keys for order ${order.id}: ${rpcError.message}`);
          }
        }
      }

      // Verify the correct number of keys were created
      const { count: finalCount } = await supabase
        .from("license_keys")
        .select("id", { count: "exact", head: true })
        .eq("order_id", order.id);

      if (finalCount !== expectedTotal) {
        throw new Error(
          `Key count mismatch for order ${order.id}: expected ${expectedTotal}, got ${finalCount}`
        );
      }

      // Mark keys as generated (separate from payment status)
      await supabase
        .from("license_orders")
        .update({ keys_generated: true })
        .eq("id", order.id);
    }

    // Now mark the order as paid with full payment details
    if (order.status !== "paid") {
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
