"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LocalTime } from "@/components/local-time";

type AuditLog = {
  id: string;
  actor_user_id: string;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

const entityTypes = [
  "operator",
  "license",
  "license_tier",
  "distributor_tier",
  "admin_user",
  "license_request",
];

const actionColors: Record<string, string> = {
  create: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  add: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  generate: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  update: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  delete: "bg-red-500/10 text-red-400 border-red-500/20",
  remove: "bg-red-500/10 text-red-400 border-red-500/20",
  revoke: "bg-red-500/10 text-red-400 border-red-500/20",
  assign: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  transfer: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  unassign: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  approve: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  deny: "bg-red-500/10 text-red-400 border-red-500/20",
  update_distributor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

function getActionColor(action: string) {
  const verb = action.split(".")[1] ?? action;
  return actionColors[verb] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
}

export default function AuditLogTable({
  logs,
  actions,
  currentPage,
  totalPages,
  totalCount,
  filters,
}: {
  logs: AuditLog[];
  actions: string[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  filters: { action: string; entity: string; search: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState(filters.search);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // Reset to page 1 on filter change
    router.push(`/audit-log?${params.toString()}`);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) {
      params.set("page", page.toString());
    } else {
      params.delete("page");
    }
    router.push(`/audit-log?${params.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateFilter("search", search);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={filters.action}
          onChange={(e) => updateFilter("action", e.target.value)}
          className="rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={filters.entity}
          onChange={(e) => updateFilter("entity", e.target.value)}
          className="rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">All entities</option>
          {entityTypes.map((e) => (
            <option key={e} value={e}>{e.replace(/_/g, " ")}</option>
          ))}
        </select>

        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Search summaries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all"
          >
            Search
          </button>
        </form>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {totalCount} {totalCount === 1 ? "entry" : "entries"}
        {(filters.action || filters.entity || filters.search) && " (filtered)"}
      </p>

      {/* Table */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[750px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Time</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Admin</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Action</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Summary</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <>
                <tr key={log.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                    <LocalTime date={log.created_at} />
                  </td>
                  <td className="px-5 py-4 text-foreground">
                    <span className="text-xs">{log.actor_email}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-foreground max-w-xs truncate" title={log.summary}>
                    {log.summary}
                  </td>
                  <td className="px-5 py-4">
                    {log.details ? (
                      <button
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        {expandedId === log.id ? "Hide" : "View"}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
                {expandedId === log.id && log.details && (
                  <tr key={`${log.id}-details`} className="border-b border-border/50">
                    <td colSpan={5} className="px-5 py-4">
                      <pre className="text-xs text-muted-foreground bg-muted/50 rounded-xl border border-border p-4 overflow-x-auto max-w-full">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                  No audit log entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
