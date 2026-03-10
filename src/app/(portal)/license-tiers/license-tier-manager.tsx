"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

type LicenseTier = {
  id: string;
  name: string;
  label: string;
  price_cents: number;
  duration_days: number;
  max_concurrent_users: number | null;
  max_vouchers_per_month: number | null;
  max_sub_vendos: number;
  epayment_enabled: boolean;
  cloud_dashboard: boolean;
  remote_access: boolean;
  pppoe_enabled: boolean;
  sales_history_days: number;
  ota_channel: string;
  support_level: string;
  is_public: boolean;
  is_highlighted: boolean;
  sort_order: number;
};

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `₱${(cents / 100).toLocaleString()}`;
}

function formatLimit(val: number | null) {
  if (val === null || val === -1) return "Unlimited";
  return val.toString();
}

export default function LicenseTierManager({ initialTiers }: { initialTiers: LicenseTier[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<LicenseTier>>({});
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "",
    label: "",
    price_cents: 0,
    duration_days: 365,
    max_concurrent_users: "" as string | number,
    max_vouchers_per_month: "" as string | number,
    max_sub_vendos: 0,
    epayment_enabled: false,
    cloud_dashboard: false,
    remote_access: false,
    pppoe_enabled: false,
    sales_history_days: 1,
    ota_channel: "manual",
    support_level: "community",
    is_public: true,
    is_highlighted: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  function startEdit(tier: LicenseTier) {
    setEditing(tier.id);
    setForm({ ...tier });
  }

  async function handleUpdate(id: string) {
    setLoading(true);
    setError("");

    const { error } = await supabase
      .from("license_tiers")
      .update({
        label: form.label,
        price_cents: form.price_cents,
        duration_days: form.duration_days,
        max_concurrent_users: form.max_concurrent_users,
        max_vouchers_per_month: form.max_vouchers_per_month,
        max_sub_vendos: form.max_sub_vendos,
        epayment_enabled: form.epayment_enabled,
        cloud_dashboard: form.cloud_dashboard,
        remote_access: form.remote_access,
        pppoe_enabled: form.pppoe_enabled,
        sales_history_days: form.sales_history_days,
        ota_channel: form.ota_channel,
        support_level: form.support_level,
        is_public: form.is_public,
        is_highlighted: form.is_highlighted,
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

  async function handleAdd() {
    if (!newForm.name.trim() || !newForm.label.trim()) return;
    setLoading(true);
    setError("");

    const { error } = await supabase.from("license_tiers").insert({
      name: newForm.name.toLowerCase().replace(/\s+/g, "_"),
      label: newForm.label,
      price_cents: newForm.price_cents,
      duration_days: newForm.duration_days,
      max_concurrent_users: newForm.max_concurrent_users === "" ? null : Number(newForm.max_concurrent_users),
      max_vouchers_per_month: newForm.max_vouchers_per_month === "" ? null : Number(newForm.max_vouchers_per_month),
      max_sub_vendos: newForm.max_sub_vendos,
      epayment_enabled: newForm.epayment_enabled,
      cloud_dashboard: newForm.cloud_dashboard,
      remote_access: newForm.remote_access,
      pppoe_enabled: newForm.pppoe_enabled,
      sales_history_days: newForm.sales_history_days,
      ota_channel: newForm.ota_channel,
      support_level: newForm.support_level,
      is_public: newForm.is_public,
      is_highlighted: newForm.is_highlighted,
      sort_order: initialTiers.length + 1,
    });

    if (error) {
      toast(error.message, "error");
      setError(error.message);
    } else {
      toast("Tier added");
      setAdding(false);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Delete "${label}" tier? This may affect existing licenses using this tier.`)) return;
    setLoading(true);
    setError("");

    const { error } = await supabase.from("license_tiers").delete().eq("id", id);

    if (error) {
      toast(error.message, "error");
      setError(error.message);
    } else {
      toast(`"${label}" tier deleted`);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">{error}</p>
      )}

      {/* Tier cards */}
      <div className="space-y-3">
        {initialTiers.map((tier) => (
          <div key={tier.id} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
            {editing === tier.id ? (
              /* Edit mode */
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">Editing: {tier.label}</h3>
                  <span className="text-xs text-muted-foreground font-mono">{tier.name}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Label</label>
                    <input
                      type="text"
                      value={form.label ?? ""}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                      className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Price (centavos)</label>
                    <input
                      type="number"
                      value={form.price_cents ?? 0}
                      onChange={(e) => setForm({ ...form, price_cents: Number(e.target.value) })}
                      min={0}
                      className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="text-[11px] text-muted-foreground">{formatPrice(form.price_cents ?? 0)}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Duration (days)</label>
                    <input
                      type="number"
                      value={form.duration_days ?? 365}
                      onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}
                      min={0}
                      className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Max Users</label>
                    <input
                      type="number"
                      value={form.max_concurrent_users ?? ""}
                      onChange={(e) => setForm({ ...form, max_concurrent_users: e.target.value === "" ? null : Number(e.target.value) })}
                      placeholder="Unlimited"
                      className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Max Vouchers/mo</label>
                    <input
                      type="number"
                      value={form.max_vouchers_per_month ?? ""}
                      onChange={(e) => setForm({ ...form, max_vouchers_per_month: e.target.value === "" ? null : Number(e.target.value) })}
                      placeholder="Unlimited"
                      className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Max Sub-vendos</label>
                    <input
                      type="number"
                      value={form.max_sub_vendos ?? 0}
                      onChange={(e) => setForm({ ...form, max_sub_vendos: Number(e.target.value) })}
                      min={-1}
                      className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="text-[11px] text-muted-foreground">-1 = unlimited</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Sales History (days)</label>
                    <input
                      type="number"
                      value={form.sales_history_days ?? 1}
                      onChange={(e) => setForm({ ...form, sales_history_days: Number(e.target.value) })}
                      min={-1}
                      className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="text-[11px] text-muted-foreground">-1 = unlimited</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">OTA Channel</label>
                    <select
                      value={form.ota_channel ?? "manual"}
                      onChange={(e) => setForm({ ...form, ota_channel: e.target.value })}
                      className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="manual">Manual</option>
                      <option value="stable">Stable</option>
                      <option value="all">All Channels</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Features</label>
                  <div className="flex flex-wrap gap-3">
                    {([
                      ["epayment_enabled", "E-Payment"],
                      ["cloud_dashboard", "Cloud Dashboard"],
                      ["remote_access", "Remote Access"],
                      ["pppoe_enabled", "PPPoE"],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!form[key]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                          className="rounded border-border"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form.is_public}
                      onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                      className="rounded border-border"
                    />
                    Show on landing page
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form.is_highlighted}
                      onChange={(e) => setForm({ ...form, is_highlighted: e.target.checked })}
                      className="rounded border-border"
                    />
                    Highlight as &quot;Most Popular&quot;
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleUpdate(tier.id)}
                    disabled={loading}
                    className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="bg-muted text-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted/80 border border-border transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{tier.label}</h3>
                      <span className="text-xs text-muted-foreground font-mono">({tier.name})</span>
                      {tier.is_highlighted && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium border bg-primary/10 text-primary border-primary/20">
                          Highlighted
                        </span>
                      )}
                      {!tier.is_public && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                          Hidden
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">{formatPrice(tier.price_cents)}</span>
                      {tier.duration_days > 0 && (
                        <span className="text-sm text-muted-foreground">/{tier.duration_days === 365 ? "year" : `${tier.duration_days}d`}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(tier)}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tier.id, tier.label)}
                      className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Max Users</span>
                    <p className="text-foreground font-medium">{formatLimit(tier.max_concurrent_users)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vouchers/mo</span>
                    <p className="text-foreground font-medium">{formatLimit(tier.max_vouchers_per_month)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sub-vendos</span>
                    <p className="text-foreground font-medium">{formatLimit(tier.max_sub_vendos === -1 ? null : tier.max_sub_vendos)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sales History</span>
                    <p className="text-foreground font-medium">{tier.sales_history_days === -1 ? "Unlimited" : `${tier.sales_history_days}d`}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tier.epayment_enabled && <FeatureChip label="E-Payment" />}
                  {tier.cloud_dashboard && <FeatureChip label="Cloud Dashboard" />}
                  {tier.remote_access && <FeatureChip label="Remote Access" />}
                  {tier.pppoe_enabled && <FeatureChip label="PPPoE" />}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] text-muted-foreground border border-border">
                    OTA: {tier.ota_channel}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] text-muted-foreground border border-border">
                    Support: {tier.support_level}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}

        {initialTiers.length === 0 && (
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-12 text-center text-muted-foreground">
            No license tiers configured yet
          </div>
        )}
      </div>

      {/* Add tier */}
      {adding ? (
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 sm:p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Add New License Tier</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Name (key)</label>
              <input
                type="text"
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="e.g. starter"
                className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Label</label>
              <input
                type="text"
                value={newForm.label}
                onChange={(e) => setNewForm({ ...newForm, label: e.target.value })}
                placeholder="e.g. Starter"
                className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Price (centavos)</label>
              <input
                type="number"
                value={newForm.price_cents}
                onChange={(e) => setNewForm({ ...newForm, price_cents: Number(e.target.value) })}
                min={0}
                className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="text-[11px] text-muted-foreground">{formatPrice(newForm.price_cents)}</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Max Users</label>
              <input
                type="number"
                value={newForm.max_concurrent_users}
                onChange={(e) => setNewForm({ ...newForm, max_concurrent_users: e.target.value === "" ? "" : Number(e.target.value) })}
                placeholder="Unlimited"
                className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {([
              ["epayment_enabled", "E-Payment"],
              ["cloud_dashboard", "Cloud Dashboard"],
              ["remote_access", "Remote Access"],
              ["pppoe_enabled", "PPPoE"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!newForm[key]}
                  onChange={(e) => setNewForm({ ...newForm, [key]: e.target.checked })}
                  className="rounded border-border"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setAdding(false)}
              className="bg-muted text-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-muted/80 border border-border transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={loading || !newForm.name.trim() || !newForm.label.trim()}
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
            >
              {loading ? "Adding..." : "Add Tier"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Tier
        </button>
      )}
    </div>
  );
}

function FeatureChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      {label}
    </span>
  );
}
