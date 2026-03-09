"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type DistributorTier = {
  id: string;
  name: string;
  label: string;
  discount_pct: number;
};

type LicensePrice = {
  name: string;
  label: string;
  price_cents: number;
};

export default function DistributorToggle({
  operatorId,
  isDistributor,
  distributorTier,
}: {
  operatorId: string;
  isDistributor: boolean;
  distributorTier: string | null;
}) {
  const [enabled, setEnabled] = useState(isDistributor);
  const [tier, setTier] = useState(distributorTier ?? "");
  const [tiers, setTiers] = useState<DistributorTier[]>([]);
  const [licensePrices, setLicensePrices] = useState<LicensePrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase
      .from("distributor_tiers")
      .select("id, name, label, discount_pct")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setTiers(data);
          if (!tier) setTier(data[0].name);
        }
      });
    supabase
      .from("license_tiers")
      .select("name, label, price_cents")
      .gt("price_cents", 0)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setLicensePrices(data);
      });
  }, []);

  const selectedTier = tiers.find((t) => t.name === tier);

  async function handleSave() {
    setLoading(true);
    setSaved(false);

    const { error } = await supabase
      .from("operators")
      .update({
        is_distributor: enabled,
        distributor_tier: enabled ? tier : null,
        distributor_discount_pct: enabled ? (selectedTier?.discount_pct ?? 0) : 0,
      })
      .eq("id", operatorId);

    if (error) {
      alert(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72" />
        </svg>
        Distributor Settings
      </h2>

      <div className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Distributor Access</p>
            <p className="text-xs text-muted-foreground">Allow this operator to request and transfer licenses</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? "bg-primary" : "bg-muted border border-border"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Tier selection (only when enabled) */}
        {enabled && tiers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Distributor Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {tiers.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.label} ({t.discount_pct}% wholesale discount)
                </option>
              ))}
            </select>
            {selectedTier && licensePrices.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {licensePrices.map((lp, i) => (
                  <span key={lp.name}>
                    {i > 0 && " · "}
                    {lp.label}: ₱{(Math.round(lp.price_cents * (1 - selectedTier.discount_pct / 100)) / 100).toLocaleString()}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
          >
            {loading ? "Saving..." : "Save"}
          </button>
          {saved && (
            <span className="text-sm text-emerald-400">Saved</span>
          )}
        </div>
      </div>
    </div>
  );
}
