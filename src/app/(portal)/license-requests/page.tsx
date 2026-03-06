import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import RequestActions from "./request-actions";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    denied: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${styles[status] ?? styles.pending}`}>
      {status}
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

export default async function LicenseRequestsPage() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) redirect("/signin");

  const supabase = await createClient();
  const isAdmin = ctx.role === "admin";

  let query = supabase
    .from("license_requests")
    .select("*, operators(name, email), license_keys(id, key, is_activated, machine_id)")
    .order("created_at", { ascending: false });

  if (!isAdmin && ctx.operatorId) {
    query = query.eq("operator_id", ctx.operatorId);
  }

  const { data: requests } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">License Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Review and manage license requests from operators" : "Request license keys from admin"}
          </p>
        </div>
        {!isAdmin && (
          <Link
            href="/license-requests/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Request
          </Link>
        )}
      </div>

      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {isAdmin && <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Operator</th>}
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Tier</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Qty</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Duration</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Keys</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Requested</th>
              {isAdmin && <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {requests?.map((req) => (
              <tr key={req.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                {isAdmin && (
                  <td className="px-5 py-4 text-foreground">
                    {req.operators?.name || req.operators?.email || "-"}
                  </td>
                )}
                <td className="px-5 py-4"><TierBadge tier={req.tier} /></td>
                <td className="px-5 py-4 text-foreground">{req.quantity}</td>
                <td className="px-5 py-4 text-muted-foreground">{req.duration_months}mo</td>
                <td className="px-5 py-4"><StatusBadge status={req.status} /></td>
                <td className="px-5 py-4">
                  {req.license_keys && req.license_keys.length > 0 ? (
                    <Link
                      href={`/licenses?request_id=${req.id}`}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      {req.license_keys.length} key{req.license_keys.length > 1 ? "s" : ""}
                      <span className="text-muted-foreground ml-1">
                        ({req.license_keys.filter((k: { is_activated: boolean }) => k.is_activated).length} activated)
                      </span>
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {new Date(req.created_at).toLocaleDateString()}
                </td>
                {isAdmin && (
                  <td className="px-5 py-4">
                    {req.status === "pending" && (
                      <RequestActions requestId={req.id} operatorId={req.operator_id} tier={req.tier} quantity={req.quantity} durationMonths={req.duration_months} />
                    )}
                    {req.status === "denied" && req.denial_reason && (
                      <span className="text-xs text-muted-foreground" title={req.denial_reason}>Reason: {req.denial_reason}</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {(!requests || requests.length === 0) && (
              <tr>
                <td colSpan={isAdmin ? 8 : 6} className="px-5 py-12 text-center text-muted-foreground">
                  No license requests yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
