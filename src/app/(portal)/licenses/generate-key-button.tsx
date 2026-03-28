"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { logAdminActionClient } from "@/lib/audit-client";

type Operator = { id: string; name: string | null; email: string; distributor_discount_pct?: number };
type GeneratedKey = { id: string; key: string; tier: string };
type LicenseTierOption = { name: string; label: string; product: string; duration_days: number; price_cents: number };

const PRODUCT_LABELS: Record<string, string> = {
  symflofi: "SymfloFi",
  playtab: "PlayTab",
  symflokiosk: "SymfloKiosk",
};

export default function GenerateKeyButton({ operators }: { operators: Operator[] }) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState("pro");
  const [tierOptions, setTierOptions] = useState<LicenseTierOption[]>([]);
  const [product, setProduct] = useState("symflofi");
  const [operatorId, setOperatorId] = useState("");
  const [months, setMonths] = useState(12);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<GeneratedKey[]>([]);
  const [showAcquisitionDialog, setShowAcquisitionDialog] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState<"direct_purchase" | "credit" | null>(null);
  const [discountPct, setDiscountPct] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleNotes, setSaleNotes] = useState("");
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("license_tiers")
      .select("name, label, product, duration_days, price_cents")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setTierOptions(data);
          // Default to first tier of the default product
          const first = data.find((t) => t.product === "symflofi") ?? data[0];
          setProduct(first.product);
          setTier(first.name);
        }
      });
  }, []);

  function handleGenerateClick() {
    if (operatorId) {
      setShowAcquisitionDialog(true);
    } else {
      handleGenerate(null);
    }
  }

  function handleAcquisitionChoice(type: "direct_purchase" | "credit") {
    setShowAcquisitionDialog(false);
    // Pre-fill discount from operator's distributor discount
    const op = operators.find((o) => o.id === operatorId);
    setDiscountPct(op?.distributor_discount_pct ?? 0);
    setPaymentMethod("cash");
    setSaleNotes("");
    setShowSaleForm(type);
  }

  function getSelectedTierPrice(): number {
    const t = tierOptions.find((t) => t.name === tier && t.product === product);
    return t?.price_cents ?? 0;
  }

  function getComputedTotal(): number {
    const base = getSelectedTierPrice() * quantity;
    return Math.round(base * (1 - discountPct / 100));
  }

  async function handleSaleConfirm() {
    if (!showSaleForm || !operatorId) return;
    setShowSaleForm(null);
    await handleGenerate(showSaleForm);
  }

  async function handleGenerate(acquisitionType: string | null) {
    setShowAcquisitionDialog(false);
    setLoading(true);

    const selectedTier = tierOptions.find((t) => t.name === tier && t.product === product);
    const durationDays = selectedTier?.duration_days ?? months * 30;
    const tierLabel = selectedTier?.label ?? tier;
    let orderId: string | null = null;

    // Create order record for admin sales
    if (acquisitionType && operatorId) {
      const totalCents = getComputedTotal();
      const unitPriceCents = Math.round(getSelectedTierPrice() * (1 - discountPct / 100));
      const isDirect = acquisitionType === "direct_purchase";

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
      orderId = order.id;

      // Create order line item
      const { error: itemErr } = await supabase.from("license_order_items").insert({
        order_id: orderId,
        tier_name: tier,
        tier_label: tierLabel,
        quantity,
        unit_price_cents: unitPriceCents,
        line_total_cents: totalCents,
        discount_pct: discountPct,
      });

      if (itemErr) {
        toast(itemErr.message, "error");
        setLoading(false);
        return;
      }
    }

    if (quantity === 1) {
      const { data, error } = await supabase.rpc("generate_license_key", {
        p_operator_id: operatorId || null,
        p_tier: tier,
        p_duration_days: durationDays,
        p_product: product,
        p_acquisition_type: acquisitionType,
      });
      if (error) {
        toast(error.message, "error");
        setLoading(false);
        return;
      }
      setGeneratedKeys([{ id: "1", key: data, tier }]);

      // Link single key to order
      if (orderId && data) {
        await supabase
          .from("license_keys")
          .update({ order_id: orderId })
          .eq("key", data);
      }
    } else {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      const { data, error } = await supabase.rpc("generate_license_keys_bulk", {
        p_operator_id: operatorId || null,
        p_tier: tier,
        p_expires_at: expiresAt.toISOString(),
        p_quantity: quantity,
        p_product: product,
        p_acquisition_type: acquisitionType,
        p_order_id: orderId,
      });
      if (error) {
        toast(error.message, "error");
        setLoading(false);
        return;
      }
      setGeneratedKeys((data ?? []).map((k: { id: string; key: string; tier: string }) => ({
        id: k.id,
        key: k.key,
        tier: k.tier,
      })));
    }

    setLoading(false);
    router.refresh();

    logAdminActionClient({
      action: "license.generate",
      entityType: "license",
      summary: `Generated ${quantity} ${tier} (${product}) license key(s)${acquisitionType ? ` [${acquisitionType}]` : ""}`,
      details: { tier, product, operatorId: operatorId || null, quantity, months, acquisitionType, orderId, discountPct },
    });
  }

  function handleClose() {
    setOpen(false);
    setGeneratedKeys([]);
    setQuantity(1);
    setShowAcquisitionDialog(false);
    setShowSaleForm(null);
  }

  function handleCopyAll() {
    const text = generatedKeys.map((k) => k.key).join("\n");
    navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  }

  function handleDownloadCSV() {
    const csv = "key,tier\n" + generatedKeys.map((k) => `${k.key},${k.tier}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `license-keys-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("CSV downloaded");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Generate Keys
      </button>
    );
  }

  return (
    <>
    {showAcquisitionDialog && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm mx-4 p-4 sm:p-6 sm:mx-auto">
          <h3 className="text-lg font-bold text-foreground mb-2">Payment Type</h3>
          <p className="text-sm text-muted-foreground mb-5">
            How is this operator acquiring {quantity > 1 ? "these licenses" : "this license"}?
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
    )}
    {showSaleForm && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm mx-4 p-4 sm:p-6 sm:mx-auto">
          <h3 className="text-lg font-bold text-foreground mb-1">
            {showSaleForm === "direct_purchase" ? "Record Sale" : "Record Credit"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {quantity}x {tierOptions.find((t) => t.name === tier && t.product === product)?.label ?? tier} ({PRODUCT_LABELS[product] ?? product})
          </p>

          <div className="space-y-3">
            {/* Price summary */}
            <div className="bg-muted border border-border rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base price</span>
                <span className="text-foreground">
                  {"\u20B1"}{((getSelectedTierPrice() * quantity) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {discountPct > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount ({discountPct}%)</span>
                  <span className="text-emerald-400">
                    -{"\u20B1"}{((getSelectedTierPrice() * quantity * discountPct / 100) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
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
                {showSaleForm === "direct_purchase" ? "Record Sale & Generate" : "Generate on Credit"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4 p-4 sm:p-6 sm:mx-auto">
        <h2 className="text-lg font-bold text-foreground mb-5">Generate License Keys</h2>

        {generatedKeys.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {generatedKeys.length} key{generatedKeys.length > 1 ? "s" : ""} generated successfully:
            </p>
            <div className="bg-muted border border-border rounded-xl p-4 max-h-60 overflow-y-auto space-y-1.5">
              {generatedKeys.map((k) => (
                <p key={k.id} className="font-mono text-sm text-foreground select-all">{k.key}</p>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopyAll}
                className="flex-1 bg-muted text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted/80 border border-border transition-all"
              >
                Copy All
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex-1 bg-muted text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted/80 border border-border transition-all"
              >
                Download CSV
              </button>
            </div>
            <button
              onClick={handleClose}
              className="w-full bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Product</label>
              <div className="flex gap-1 bg-muted rounded-xl p-1 border border-border">
                {[...new Set(tierOptions.map((t) => t.product))].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setProduct(p);
                      const first = tierOptions.find((t) => t.product === p);
                      if (first) setTier(first.name);
                    }}
                    className={`flex-1 text-sm font-medium rounded-lg px-3 py-1.5 transition-all ${
                      product === p
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {PRODUCT_LABELS[p] ?? p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {tierOptions
                  .filter((t) => t.product === product)
                  .map((t) => (
                    <option key={t.name} value={t.name}>{t.label}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Operator (optional)</label>
              <select
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Unassigned</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name || op.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Quantity</label>
              <input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(Math.min(100, Math.max(1, Number(e.target.value))))}
                className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Duration</label>
              <select
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value={1}>1 month</option>
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
                <option value={24}>24 months</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleClose}
                className="flex-1 bg-muted text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted/80 border border-border transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateClick}
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
              >
                {loading ? "Generating..." : `Generate ${quantity > 1 ? `${quantity} Keys` : "Key"}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
