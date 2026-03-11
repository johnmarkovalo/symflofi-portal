"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LicenseKey = {
  id: string;
  key: string;
  tier: string;
  is_activated: boolean;
  created_at: string;
};

export default function OrderKeys({ orderId }: { orderId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  async function toggle() {
    if (!expanded && !fetched) {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("license_keys")
        .select("id, key, tier, is_activated, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      setKeys(data ?? []);
      setFetched(true);
      setLoading(false);
    }
    setExpanded((v) => !v);
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-2"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        {expanded ? "Hide" : "Show"} License Keys
      </button>

      {expanded && (
        <div className="mt-3">
          {loading ? (
            <p className="text-xs text-muted-foreground animate-pulse">Loading keys...</p>
          ) : keys.length === 0 ? (
            <p className="text-xs text-muted-foreground">No keys generated for this order.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-foreground truncate">{k.key}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground capitalize">{k.tier}</span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        k.is_activated
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {k.is_activated ? "Activated" : "Available"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
