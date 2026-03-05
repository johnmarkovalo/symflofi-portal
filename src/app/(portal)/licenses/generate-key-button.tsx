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
        className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Generate Key
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Generate License Key</h2>

        {generatedKey ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">License key generated successfully:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="font-mono text-xl font-bold text-gray-900 select-all">{generatedKey}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(generatedKey); }}
              className="w-full bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Copy to Clipboard
            </button>
            <button
              onClick={handleClose}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="trial">Trial</option>
                <option value="lite">Lite</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operator (optional)</label>
              <select
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (months)</label>
              <select
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
                className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
