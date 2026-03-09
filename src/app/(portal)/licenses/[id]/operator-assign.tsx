"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignLicenseOperator } from "./actions";

type Operator = {
  id: string;
  name: string | null;
  email: string;
};

export default function OperatorAssign({
  licenseId,
  currentOperatorId,
  operators,
}: {
  licenseId: string;
  currentOperatorId: string | null;
  operators: Operator[];
}) {
  const [selectedId, setSelectedId] = useState(currentOperatorId ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const hasChanged = selectedId !== (currentOperatorId ?? "");

  async function handleSave() {
    setLoading(true);
    setError("");
    setSaved(false);

    try {
      const result = await assignLicenseOperator(licenseId, selectedId || null);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <select
        value={selectedId}
        onChange={(e) => { setSelectedId(e.target.value); setSaved(false); }}
        className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
      >
        <option value="">Unassigned</option>
        {operators.map((op) => (
          <option key={op.id} value={op.id}>
            {op.name || op.email}
          </option>
        ))}
      </select>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={loading || !hasChanged}
          className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
        >
          {loading ? "Saving..." : "Update Operator"}
        </button>
        {saved && (
          <span className="text-xs text-emerald-400">Updated</span>
        )}
      </div>
    </div>
  );
}
