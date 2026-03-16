"use client";

import { useState } from "react";
import Link from "next/link";
import { LocalTime } from "@/components/local-time";

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
  const [filter, setFilter] = useState<ProductFilter>("all");

  const filtered = filter === "all"
    ? machines
    : machines.filter((m) => (m.product ?? "symflofi") === filter);

  const now = Date.now(); // eslint-disable-line react-hooks/purity

  const tabs: { key: ProductFilter; label: string }[] = [
    { key: "all", label: `All (${machines.length})` },
    { key: "symflofi", label: `SymfloFi (${machines.filter((m) => (m.product ?? "symflofi") === "symflofi").length})` },
    { key: "playtab", label: `PlayTab (${machines.filter((m) => m.product === "playtab").length})` },
  ];

  return (
    <>
      <div className="flex items-center gap-1 mb-4 bg-muted/50 rounded-xl p-1 w-fit">
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

      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
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
