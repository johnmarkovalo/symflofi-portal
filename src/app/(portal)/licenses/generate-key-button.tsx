"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Operator = { id: string; name: string | null; email: string };

export default function GenerateKeyButton({ operators }: { operators: Operator[] }) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState("pro");
  const [operatorId, setOperatorId] = useState("");
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleGenerate() {
    setLoading(true);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const { data, error } = await supabase.rpc("generate_license_key", {
      p_operator_id: operatorId || null,
      p_tier: tier,
      p_expires_at: expiresAt.toISOString(),
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setGeneratedKey(data);
    setLoading(false);
    router.refresh();
  }

  function handleClose() {
    setOpen(false);
    setGeneratedKey("");
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
        Generate Key
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-foreground mb-5">Generate License Key</h2>

        {generatedKey ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">License key generated successfully:</p>
            <div className="bg-muted border border-border rounded-xl p-5 text-center">
              <p className="font-mono text-xl font-bold text-foreground select-all">{generatedKey}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(generatedKey); }}
              className="w-full bg-muted text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted/80 border border-border transition-all"
            >
              Copy to Clipboard
            </button>
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
                <option value="trial">Trial</option>
                <option value="lite">Lite</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
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
                {loading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
