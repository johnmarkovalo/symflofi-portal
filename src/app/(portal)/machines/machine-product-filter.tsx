"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import SearchableSelect from "@/components/searchable-select";

type Machine = {
  id: string;
  name: string | null;
  machine_uuid: string;
  last_seen_at: string | null;
  license_tier: string;
  hardware: string | null;
  app_version: string | null;
  product: string | null;
  operators: { name: string | null; email: string } | null;
};

function ProductBadge({ product }: { product: string | null }) {
  const p = product ?? "symflofi";
  const styles: Record<string, string> = {
    symflofi: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    playtab: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  const labels: Record<string, string> = { symflofi: "SymfloFi", playtab: "PlayTab" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${styles[p] ?? styles.symflofi}`}>
      {labels[p] ?? p}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    enterprise: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    pro: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    lite: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    demo: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${styles[tier] ?? styles.demo}`}>
      {tier}
    </span>
  );
}

type ProductFilter = "all" | "symflofi" | "playtab";

export default function MachineProductFilter({
  machines,
  isAdmin,
}: {
  machines: Machine[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [filter, setFilter] = useState<ProductFilter>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [tierFilter, setTierFilter] = useState<"all" | string>("all");
  const [operatorFilter, setOperatorFilter] = useState<"all" | string>("all");

  const now = Date.now(); // eslint-disable-line react-hooks/purity

  // Derive unique tiers and operators for filter dropdowns
  const tiers = [...new Set(machines.map((m) => m.license_tier))].sort();
  const operators = isAdmin
    ? [...new Map(machines.filter((m) => m.operators).map((m) => [m.operators!.email, m.operators!])).entries()]
        .map(([email, op]) => ({ email, name: op.name }))
        .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
    : [];

  const searchLower = search.toLowerCase();

  const filtered = machines.filter((m) => {
    // Product filter
    if (filter !== "all" && (m.product ?? "symflofi") !== filter) return false;
    // Status filter
    const isOnline = m.last_seen_at && new Date(m.last_seen_at).getTime() > now - 5 * 60 * 1000;
    if (statusFilter === "online" && !isOnline) return false;
    if (statusFilter === "offline" && isOnline) return false;
    // Tier filter
    if (tierFilter !== "all" && m.license_tier !== tierFilter) return false;
    // Operator filter
    if (operatorFilter !== "all" && m.operators?.email !== operatorFilter) return false;
    // Search
    if (searchLower) {
      const haystack = [
        m.name,
        m.machine_uuid,
        m.operators?.name,
        m.operators?.email,
        m.hardware,
        m.app_version,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(searchLower)) return false;
    }
    return true;
  });

  const tabs: { key: ProductFilter; label: string }[] = [
    { key: "all", label: `All (${machines.length})` },
    { key: "symflofi", label: `SymfloFi (${machines.filter((m) => (m.product ?? "symflofi") === "symflofi").length})` },
    { key: "playtab", label: `PlayTab (${machines.filter((m) => m.product === "playtab").length})` },
  ];

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search machines, operators..."
              className="w-full rounded-xl bg-muted/50 border border-border pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={() => startTransition(() => router.refresh())}
            disabled={refreshing}
            className="rounded-xl bg-muted/50 border border-border p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
            title="Refresh data"
          >
            <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M21.015 4.356v4.992" />
            </svg>
          </button>

          {/* Status filter */}
          <SearchableSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as typeof statusFilter)}
            placeholder="All statuses"
            options={[
              { value: "all", label: "All statuses" },
              { value: "online", label: "Online" },
              { value: "offline", label: "Offline" },
            ]}
          />

          {/* Tier filter */}
          <SearchableSelect
            value={tierFilter}
            onChange={setTierFilter}
            placeholder="All tiers"
            options={[
              { value: "all", label: "All tiers" },
              ...tiers.map((t) => ({ value: t, label: t })),
            ]}
          />

          {/* Operator filter (admin only) */}
          {isAdmin && operators.length > 0 && (
            <SearchableSelect
              value={operatorFilter}
              onChange={setOperatorFilter}
              placeholder="All operators"
              options={[
                { value: "all", label: "All operators" },
                ...operators.map((op) => ({ value: op.email, label: op.name || op.email })),
              ]}
            />
          )}
        </div>

        <div className="flex items-center justify-between">
          {/* Product tabs */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === tab.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Result count */}
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {machines.length} machines
          </span>
        </div>
      </div>

      <div className="relative bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-x-auto">
        {refreshing && (
          <div className="absolute inset-x-0 top-0 z-10 h-1 overflow-hidden rounded-t-2xl">
            <div className="h-full w-1/3 bg-primary animate-[loading_1s_ease-in-out_infinite]" />
          </div>
        )}
        <table className={`w-full text-sm min-w-[700px] ${refreshing ? "opacity-50" : ""}`}>
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Name</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Status</th>
              {isAdmin && (
                <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Operator</th>
              )}
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Product</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Tier</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Hardware</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Version</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const isOnline = m.last_seen_at &&
                new Date(m.last_seen_at).getTime() > now - 5 * 60 * 1000;
              const isPlayTab = (m.product ?? "symflofi") === "playtab";
              const hardwareLabel = isPlayTab
                ? (m.hardware || "Android Tablet")
                : (m.hardware || "-");
              return (
                <tr key={m.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/machines/${m.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {m.name || m.machine_uuid.slice(0, 12)}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isOnline ? "text-emerald-400" : "text-zinc-500"}`}>
                      <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-zinc-600"}`} />
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-4 text-muted-foreground">
                      {m.operators?.name || m.operators?.email || "-"}
                    </td>
                  )}
                  <td className="px-5 py-4">
                    <ProductBadge product={m.product} />
                  </td>
                  <td className="px-5 py-4"><TierBadge tier={m.license_tier} /></td>
                  <td className="px-5 py-4 text-muted-foreground">{hardwareLabel}</td>
                  <td className="px-5 py-4 text-muted-foreground font-mono text-xs">{m.app_version || "-"}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {m.last_seen_at ? <LocalTime date={m.last_seen_at} /> : "Never"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-5 py-12 text-center text-muted-foreground">
                  {machines.length === 0 ? "No machines registered yet" : "No machines match the selected filter"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
