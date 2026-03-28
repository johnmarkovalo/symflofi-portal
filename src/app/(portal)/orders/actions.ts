"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";

export async function recordCreditPayment(
  orderId: string,
  amountCents: number,
  paymentMethod: string,
  notes?: string,
) {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Fetch order to validate
  const { data: order, error: fetchErr } = await supabase
    .from("license_orders")
    .select("id, status, total_price_cents, amount_paid_cents")
    .eq("id", orderId)
    .single();

  if (fetchErr || !order) {
    return { error: "Order not found" };
  }

  if (order.status !== "credit" && order.status !== "partially_paid") {
    return { error: "Order is not on credit" };
  }

  if (amountCents <= 0) {
    return { error: "Amount must be greater than 0" };
  }

  const remaining = order.total_price_cents - (order.amount_paid_cents ?? 0);
  if (amountCents > remaining) {
    return { error: `Amount exceeds remaining balance of ₱${(remaining / 100).toFixed(2)}` };
  }

  // Insert credit payment
  const { error: insertErr } = await supabase.from("credit_payments").insert({
    order_id: orderId,
    amount_cents: amountCents,
    payment_method: paymentMethod,
    notes: notes || null,
    recorded_by: ctx.userId,
  });

  if (insertErr) {
    return { error: insertErr.message };
  }

  // Update order
  const newPaid = (order.amount_paid_cents ?? 0) + amountCents;
  const fullyPaid = newPaid >= order.total_price_cents;

  const { error: updateErr } = await supabase
    .from("license_orders")
    .update({
      amount_paid_cents: newPaid,
      status: fullyPaid ? "paid" : "partially_paid",
      paid_at: fullyPaid ? new Date().toISOString() : null,
    })
    .eq("id", orderId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  return { success: true, fullyPaid };
}
