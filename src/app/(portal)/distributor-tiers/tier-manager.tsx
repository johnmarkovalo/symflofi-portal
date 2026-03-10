"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

type Tier = {
  id: string;
  name: string;
  label: string;
  discount_pct: number;
  min_licenses: number;
  bonus_licenses: number;
  sort_order: number;
};

type LicensePrice = {
  name: string;
  label: string;
  price_cents: number;
};

function formatPrice(cents: number) {
  return `₱${(cents / 100).toLocaleString()}`;
}

export default function TierManager({ initialTiers, licensePrices }: { initialTiers: Tier[]; licensePrices: LicensePrice[] }) {
  const [tiers, setTiers] = useState(initialTiers);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDiscount, setNewDiscount] = useState(10);
  const [newMinLicenses, setNewMinLicenses] = useState(0);
  const [newBonusLicenses, setNewBonusLicenses] = useState(0);
  const [editLabel, setEditLabel] = useState("");
  const [editDiscount, setEditDiscount] = useState(0);
  const [editMinLicenses, setEditMinLicenses] = useState(0);
  const [editBonusLicenses, setEditBonusLicenses] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  async function handleAdd() {
    if (!newName.trim() || !newLabel.trim()) return;
    setLoading(true);
    setError("");

    const { error } = await supabase.from("distributor_tiers").insert({
      name: newName.toLowerCase().replace(/\s+/g, "_"),
      label: newLabel,
      discount_pct: newDiscount,
      min_licenses: newMinLicenses,
      bonus_licenses: newBonusLicenses,
      sort_order: tiers.length + 1,
    });

    if (error) {
      toast(error.message, "error");
      setError(error.message);
    } else {
      toast("Tier added");
      setAdding(false);
      setNewName("");
      setNewLabel("");
      setNewDiscount(10);
      setNewMinLicenses(0);
      setNewBonusLicenses(0);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleUpdate(id: string) {
    setLoading(true);
    setError("");

    const { error } = await supabase
      .from("distributor_tiers")
      .update({
        label: editLabel,
        discount_pct: editDiscount,
        min_licenses: editMinLicenses,
        bonus_licenses: editBonusLicenses,
      })
      .eq("id", id);

    if (error) {
      toast(error.message, "error");
      setError(error.message);
    } else {
      toast("Tier updated");
      setEditing(null);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}" tier? Distributors using this tier will need to be reassigned.`)) return;
    setLoading(true);
    setError("");

    const { error } = await supabase
      .from("distributor_tiers")
      .delete()
      .eq("id", id);

    if (error) {
      toast(error.message, "error");
      setError(error.message);
    } else {
      toast(`"${name}" tier deleted`);
      setTiers(tiers.filter((t) => t.id !== id));
      router.refresh();
    }
    setLoading(false);
  }

  function startEdit(tier: Tier) {
    setEditing(tier.id);
    setEditLabel(tier.label);
    setEditDiscount(tier.discount_pct);
    setEditMinLicenses(tier.min_licenses);
    setEditBonusLicenses(tier.bonus_licenses);
  }

  function discountedPrice(priceCents: number, discountPct: number) {
    return Math.round(priceCents * (1 - discountPct / 100));
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">{error}</p>
      )}

      {/* Pricing reference */}
      <div className="bg-muted/50 rounded-xl border border-border px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground mb-1">Base license prices (annual, per device)</p>
        <div className="flex gap-4 text-xs text-foreground">
          {licensePrices.map((lp) => (
            <span key={lp.name}>{lp.label}: <strong>{formatPrice(lp.price_cents)}</strong></span>
          ))}
        </div>
      </div>

      {/* Tier cards */}
      <div className="space-y-3">
        {tiers.map((tier) => (
          <div key={tier.id} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 sm:p-6">
            {editing === tier.id ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Editing: {tier.label}</h3>
                  <span className="text-xs text-muted-foreground font-mono">{tier.name}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Label</label>
                    <input type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Discount %</label>
                    <input type="number" value={editDiscount} onChange={(e) => setEditDiscount(Number(e.target.value))} min={0} max={50}
                      className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Auto-promote at</label>
                    <input type="number" value={editMinLicenses} onChange={(e) => setEditMinLicenses(Number(e.target.value))} min={0}
                      className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <span className="text-[11px] text-muted-foreground">0 = manual only</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Bonus licenses</label>
                    <input type="number" value={editBonusLicenses} onChange={(e) => setEditBonusLicenses(Number(e.target.value))} min={0}
                      className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>

                <div className="bg-muted/50 rounded-xl border border-border px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Wholesale pricing preview</p>
                  <div className="flex gap-4 text-xs">
                    {licensePrices.map((lp) => (
                      <div key={lp.name} className="flex gap-1.5">
                        <span className="text-muted-foreground">{lp.label}:</span>
                        <span className="text-foreground font-medium">{formatPrice(discountedPrice(lp.price_cents, editDiscount))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(tier.id)} disabled={loading}
                    className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25">
                    {loading ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => setEditing(null)}
                    className="bg-muted text-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted/80 border border-border transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{tier.label}</h3>
                      <span className="text-xs text-muted-foreground font-mono">({tier.name})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        {tier.discount_pct}% off
                      </span>
                      {tier.min_licenses > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">
                          Auto at {tier.min_licenses} licenses
                        </span>
                      )}
                      {tier.bonus_licenses > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                          +{tier.bonus_licenses} bonus
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(tier)} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">Edit</button>
                    <button onClick={() => handleDelete(tier.id, tier.label)} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">Delete</button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {licensePrices.map((lp) => (
                    <div key={lp.name}>
                      <span className="text-muted-foreground">{lp.label}</span>
                      <p className="text-foreground font-medium">{formatPrice(discountedPrice(lp.price_cents, tier.discount_pct))}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {tiers.length === 0 && (
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-12 text-center text-muted-foreground">
            No tiers configured yet
          </div>
        )}
      </div>

      {/* Add tier form */}
      {adding ? (
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 sm:p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Add New Tier</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Name (key)</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. platinum"
                className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Label</label>
              <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Platinum"
                className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Discount %</label>
              <input type="number" value={newDiscount} onChange={(e) => setNewDiscount(Number(e.target.value))} min={0} max={50}
                className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Auto-promote at (licenses)</label>
              <input type="number" value={newMinLicenses} onChange={(e) => setNewMinLicenses(Number(e.target.value))} min={0}
                className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              <span className="text-[11px] text-muted-foreground">0 = manual only</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Bonus licenses</label>
              <input type="number" value={newBonusLicenses} onChange={(e) => setNewBonusLicenses(Number(e.target.value))} min={0}
                className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
          </div>
          {/* Preview */}
          <div className="bg-muted/50 rounded-xl border border-border px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Wholesale pricing preview</p>
            <div className="flex gap-4 text-xs">
              {licensePrices.map((lp) => (
                <div key={lp.name} className="flex gap-1.5">
                  <span className="text-muted-foreground">{lp.label}:</span>
                  <span className="text-foreground font-medium">{formatPrice(discountedPrice(lp.price_cents, newDiscount))}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setAdding(false); setError(""); }}
              className="bg-muted text-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted/80 border border-border transition-all">Cancel</button>
            <button onClick={handleAdd} disabled={loading || !newName.trim() || !newLabel.trim()}
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25">
              {loading ? "Adding..." : "Add Tier"}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Tier
        </button>
      )}
    </div>
  );
}
