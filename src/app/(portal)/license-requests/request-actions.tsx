"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { logAdminActionClient } from "@/lib/audit-client";

type Props = {
  requestId: string;
  operatorId: string;
  tier: string;
  quantity: number;
  durationMonths: number;
  tierPriceCents: number;
  tierLabel: string;
  tierProduct: string;
  operatorDiscountPct: number;
};

export default function RequestActions({
  requestId,
  operatorId,
  tier,
  quantity,
  durationMonths,
  tierPriceCents,
  tierLabel,
  tierProduct,
  operatorDiscountPct,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [showDeny, setShowDeny] = useState(false);
  const [denyReason, setDenyReason] = useState("");
  const [showAcquisitionDialog, setShowAcquisitionDialog] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState<"direct_purchase" | "credit" | null>(null);
  const [discountPct, setDiscountPct] = useState(operatorDiscountPct);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleNotes, setSaleNotes] = useState("");
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  function getComputedTotal(): number {
    const base = tierPriceCents * quantity;
    return Math.round(base * (1 - discountPct / 100));
  }

  function handleApproveClick() {
    setShowAcquisitionDialog(true);
  }

  function handleAcquisitionChoice(type: "direct_purchase" | "credit") {
    setShowAcquisitionDialog(false);
    setDiscountPct(operatorDiscountPct);
    setPaymentMethod("cash");
    setSaleNotes("");
    setShowSaleForm(type);
  }

  async function handleSaleConfirm() {
    if (!showSaleForm) return;
    const acquisitionType = showSaleForm;
    setShowSaleForm(null);
    setLoading(true);

    const product = tierProduct;
    const durationDays = durationMonths * 30;
    const totalCents = getComputedTotal();
    const unitPriceCents = Math.round(tierPriceCents * (1 - discountPct / 100));
    const isDirect = acquisitionType === "direct_purchase";

    // Create order record
    const { data: order, error: orderErr } = await supabase
      .from("license_orders")
      .insert({
        operator_id: operatorId,
        total_price_cents: totalCents,
        status: isDirect ? "paid" : "credit",
        payment_method: isDirect ? paymentMethod : null,
        paid_at: isDirect ? new Date().toISOString() : null,
        source: "admin",
        discount_pct: discountPct,
        notes: saleNotes || null,
        amount_paid_cents: isDirect ? totalCents : 0,
        keys_generated: true,
      })
      .select("id")
      .single();

    if (orderErr) {
      toast(orderErr.message, "error");
      setLoading(false);
      return;
    }

    // Create order line item
    await supabase.from("license_order_items").insert({
      order_id: order.id,
      tier_name: tier,
      tier_label: tierLabel,
      quantity,
      unit_price_cents: unitPriceCents,
      line_total_cents: totalCents,
      discount_pct: discountPct,
    });

    // Update request status
    await supabase
      .from("license_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", requestId);

    // Generate keys
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    if (quantity === 1) {
      const { data } = await supabase.rpc("generate_license_key", {
        p_operator_id: operatorId,
        p_tier: tier,
        p_duration_days: durationDays,
        p_product: product,
        p_acquisition_type: acquisitionType,
      });
      if (data) {
        await supabase
          .from("license_keys")
          .update({ request_id: requestId, order_id: order.id })
          .eq("key", data);
      }
    } else {
      await supabase.rpc("generate_license_keys_bulk", {
        p_operator_id: operatorId,
        p_tier: tier,
        p_expires_at: expiresAt.toISOString(),
        p_quantity: quantity,
        p_request_id: requestId,
        p_order_id: order.id,
        p_product: product,
        p_acquisition_type: acquisitionType,
      });
    }

    toast(`Request approved — ${quantity} key${quantity !== 1 ? "s" : ""} generated [${acquisitionType.replace("_", " ")}]`);
    logAdminActionClient({
      action: "license_request.approve",
      entityType: "license_request",
      entityId: requestId,
      summary: `Approved license request (${quantity}x ${tier}) [${acquisitionType}]`,
      details: { operatorId, tier, quantity, durationMonths, acquisitionType, orderId: order.id, discountPct },
    });
    setLoading(false);
    router.refresh();
  }

  async function handleDeny() {
    setLoading(true);
    await supabase
      .from("license_requests")
      .update({
        status: "denied",
        denial_reason: denyReason || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    toast("Request denied");
    logAdminActionClient({
      action: "license_request.deny",
      entityType: "license_request",
      entityId: requestId,
      summary: `Denied license request (${quantity}x ${tier})`,
      details: { operatorId, tier, quantity, durationMonths, denyReason: denyReason || null },
    });
    setLoading(false);
    setShowDeny(false);
    router.refresh();
  }

  // Acquisition type dialog (modal)
  if (showAcquisitionDialog) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm mx-4 p-4 sm:p-6 sm:mx-auto">
          <h3 className="text-lg font-bold text-foreground mb-2">Payment Type</h3>
          <p className="text-sm text-muted-foreground mb-5">
            How is this operator paying for {quantity > 1 ? `these ${quantity} licenses` : "this license"}?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleAcquisitionChoice("direct_purchase")}
              className="w-full bg-primary text-primary-foreground rounded-xl px-4 py-3 text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
            >
              Direct Purchase
              <span className="block text-xs font-normal opacity-75 mt-0.5">Operator paid upfront</span>
            </button>
            <button
              onClick={() => handleAcquisitionChoice("credit")}
              className="w-full bg-muted text-foreground rounded-xl px-4 py-3 text-sm font-medium hover:bg-muted/80 border border-border transition-all"
            >
              Credit
              <span className="block text-xs font-normal text-muted-foreground mt-0.5">Operator will pay later</span>
            </button>
            <button
              onClick={() => setShowAcquisitionDialog(false)}
              className="w-full text-muted-foreground text-sm py-2 hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sale details form (modal)
  if (showSaleForm) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm mx-4 p-4 sm:p-6 sm:mx-auto">
          <h3 className="text-lg font-bold text-foreground mb-1">
            {showSaleForm === "direct_purchase" ? "Record Sale" : "Record Credit"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {quantity}x {tierLabel}
          </p>

          <div className="space-y-3">
            {/* Price summary */}
            <div className="bg-muted border border-border rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base price</span>
                <span className="text-foreground">
                  {"\u20B1"}{((tierPriceCents * quantity) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {discountPct > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount ({discountPct}%)</span>
                  <span className="text-emerald-400">
                    -{"\u20B1"}{((tierPriceCents * quantity * discountPct / 100) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold border-t border-border pt-1.5">
                <span className="text-foreground">{showSaleForm === "credit" ? "Amount owed" : "Total"}</span>
                <span className="text-foreground">
                  {"\u20B1"}{(getComputedTotal() / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Discount */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Discount %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={discountPct}
                onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Payment method (direct purchase only) */}
            {showSaleForm === "direct_purchase" && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="maya">Maya</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Notes (optional)</label>
              <input
                type="text"
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                placeholder={showSaleForm === "credit" ? "e.g., Due by April 15" : "e.g., Paid via GCash"}
                className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowSaleForm(null)}
                className="flex-1 bg-muted text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted/80 border border-border transition-all"
              >
                Back
              </button>
              <button
                onClick={handleSaleConfirm}
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
              >
                {showSaleForm === "direct_purchase" ? "Approve & Record" : "Approve on Credit"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Deny reason input
  if (showDeny) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Reason (optional)"
          value={denyReason}
          onChange={(e) => setDenyReason(e.target.value)}
          className="rounded-lg bg-muted border border-border px-2 py-1 text-xs text-foreground w-32 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button
          onClick={handleDeny}
          disabled={loading}
          className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          onClick={() => setShowDeny(false)}
          className="text-xs px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground transition-all"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleApproveClick}
        disabled={loading}
        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
      >
        {loading ? "..." : "Approve"}
      </button>
      <button
        onClick={() => setShowDeny(true)}
        disabled={loading}
        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
      >
        Deny
      </button>
    </div>
  );
}
