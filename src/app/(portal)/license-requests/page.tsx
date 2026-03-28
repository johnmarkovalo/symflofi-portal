import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import RequestActions from "./request-actions";
import { LocalTime } from "@/components/local-time";

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
    .select("*, operators(name, email, distributor_discount_pct), license_keys(id, key, is_activated, machine_id)")
    .order("created_at", { ascending: false });

  // Fetch tier prices for admin sale tracking
  const { data: tierPrices } = isAdmin
    ? await supabase.from("license_tiers").select("name, product, price_cents, label")
    : { data: null };
  const tierPriceMap: Record<string, { price_cents: number; label: string; product: string }> = {};
  for (const t of tierPrices ?? []) {
    tierPriceMap[t.name] = { price_cents: t.price_cents, label: t.label, product: t.product };
  }

  if (!isAdmin && ctx.operatorId) {
    query = query.eq("operator_id", ctx.operatorId);
  }

  const { data: requests } = await query;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">License Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Review and manage license requests from distributors" : "Request bulk license keys from admin"}
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

      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[650px]">
          <thead>
            <tr className="border-b border-border">
              {isAdmin && <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Operator</th>}
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Tier</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Qty</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Duration</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Status</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Keys</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Requested</th>
              {isAdmin && <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Actions</th>}
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
                  <LocalTime date={req.created_at} dateOnly />
                </td>
                {isAdmin && (
                  <td className="px-5 py-4">
                    {req.status === "pending" && (
                      <RequestActions
                        requestId={req.id}
                        operatorId={req.operator_id}
                        tier={req.tier}
                        quantity={req.quantity}
                        durationMonths={req.duration_months}
                        tierPriceCents={tierPriceMap[req.tier]?.price_cents ?? 0}
                        tierLabel={tierPriceMap[req.tier]?.label ?? req.tier}
                        tierProduct={tierPriceMap[req.tier]?.product ?? "symflofi"}
                        operatorDiscountPct={req.operators?.distributor_discount_pct ?? 0}
                      />
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
