"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

type Operator = { id: string; name: string | null; email: string };
type GeneratedKey = { id: string; key: string; tier: string };
type LicenseTierOption = { name: string; label: string };

export default function GenerateKeyButton({ operators }: { operators: Operator[] }) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState("pro");
  const [tierOptions, setTierOptions] = useState<LicenseTierOption[]>([]);
  const [operatorId, setOperatorId] = useState("");
  const [months, setMonths] = useState(12);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<GeneratedKey[]>([]);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("license_tiers")
      .select("name, label")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setTierOptions(data);
          setTier(data[0].name);
        }
      });
  }, []);

  async function handleGenerate() {
    setLoading(true);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    if (quantity === 1) {
      const { data, error } = await supabase.rpc("generate_license_key", {
        p_operator_id: operatorId || null,
        p_tier: tier,
        p_expires_at: expiresAt.toISOString(),
      });
      if (error) {
        toast(error.message, "error");
        setLoading(false);
        return;
      }
      setGeneratedKeys([{ id: "1", key: data, tier }]);
    } else {
      const { data, error } = await supabase.rpc("generate_license_keys_bulk", {
        p_operator_id: operatorId || null,
        p_tier: tier,
        p_expires_at: expiresAt.toISOString(),
        p_quantity: quantity,
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
  }

  function handleClose() {
    setOpen(false);
    setGeneratedKeys([]);
    setQuantity(1);
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
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {tierOptions.map((t) => (
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
                onClick={handleGenerate}
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
  );
}
