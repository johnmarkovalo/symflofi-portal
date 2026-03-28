"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const hasChanged = selectedId !== (currentOperatorId ?? "");
  const selectedLabel = selectedId
    ? operators.find((o) => o.id === selectedId)?.name || operators.find((o) => o.id === selectedId)?.email || "Unknown"
    : "Unassigned";

  const filtered = query
    ? operators.filter((o) =>
        (o.name ?? "").toLowerCase().includes(query.toLowerCase()) ||
        o.email.toLowerCase().includes(query.toLowerCase())
      )
    : operators;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function select(id: string) {
    setSelectedId(id);
    setSaved(false);
    setOpen(false);
    setQuery("");
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    setSaved(false);

    try {
      const result = await assignLicenseOperator(licenseId, selectedId || null);
      if (result.error) {
        toast(result.error, "error");
        setError(result.error);
      } else {
        toast("Operator updated");
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
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-2 w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm transition-all cursor-pointer ${
            open ? "ring-2 ring-primary/50 border-primary/50" : ""
          } ${!selectedId ? "text-muted-foreground" : "text-foreground"}`}
        >
          <span className="truncate flex-1 text-left">{selectedLabel}</span>
          <svg className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-xl bg-card border border-border shadow-xl overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search operators..."
                className="w-full rounded-lg bg-muted border border-border px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => select("")}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  !selectedId ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Unassigned
              </button>
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
              ) : (
                filtered.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => select(op.id)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      op.id === selectedId ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {op.name || op.email}
                    {op.name && <span className="text-muted-foreground ml-1 text-xs">{op.email}</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

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
