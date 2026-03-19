"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LocalTime } from "@/components/local-time";

function TierBadge({ tier, label }: { tier: string; label?: string }) {
  const styles: Record<string, string> = {
    enterprise: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    pro: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    lite: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    demo: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${styles[tier] ?? styles.demo}`}>
      {label ?? tier}
    </span>
  );
}

type Operator = {
  id: string;
  name: string | null;
  email: string;
  is_distributor: boolean;
  created_at: string;
  license_keys: { tier: string }[];
};

export default function OperatorTable({ operators }: { operators: Operator[] }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "operator" | "distributor">("all");

  const searchLower = search.toLowerCase();

  const filtered = operators.filter((op) => {
    if (roleFilter === "distributor" && !op.is_distributor) return false;
    if (roleFilter === "operator" && op.is_distributor) return false;
    if (searchLower) {
      const haystack = [op.name, op.email].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(searchLower)) return false;
    }
    return true;
  });

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
              placeholder="Search by name or email..."
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

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="rounded-xl bg-muted/50 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
          >
            <option value="all">All roles</option>
            <option value="operator">Operators</option>
            <option value="distributor">Distributors</option>
          </select>
        </div>

        {/* Result count */}
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {operators.length} operators
        </span>
      </div>

      <div className="relative bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-x-auto">
        {refreshing && (
          <div className="absolute inset-x-0 top-0 z-10 h-1 overflow-hidden rounded-t-2xl">
            <div className="h-full w-1/3 bg-primary animate-[loading_1s_ease-in-out_infinite]" />
          </div>
        )}
        <table className={`w-full text-sm min-w-[600px] ${refreshing ? "opacity-50" : ""}`}>
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Name</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Email</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Role</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Licenses</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((op) => (
              <tr key={op.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                <td className="px-5 py-4 font-medium text-foreground">
                  <Link href={`/operators/${op.id}`} className="hover:text-primary transition-colors">
                    {op.name || "Unnamed"}
                  </Link>
                </td>
                <td className="px-5 py-4 text-muted-foreground">{op.email}</td>
                <td className="px-5 py-4">
                  {op.is_distributor ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                      distributor
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                      operator
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {op.license_keys && op.license_keys.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(
                        op.license_keys.reduce<Record<string, number>>((acc, k) => {
                          acc[k.tier] = (acc[k.tier] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([tier, count]) => (
                        <TierBadge key={tier} tier={tier} label={`${count} ${tier}`} />
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">0</span>
                  )}
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  <LocalTime date={op.created_at} dateOnly />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                  {operators.length === 0 ? "No operators yet" : "No operators match the current filters"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
