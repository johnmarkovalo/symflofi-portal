import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getUserContext } from "@/lib/roles";
import Link from "next/link";
import DistributorToggle from "./distributor-toggle";

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    unbound: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    expired: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${styles[status] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>
      {status}
    </span>
  );
}

export default async function OperatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") redirect("/licenses");

  const { id } = await params;
  const supabase = await createClient();

  const { data: operator } = await supabase
    .from("operators")
    .select("*")
    .eq("id", id)
    .single();

  if (!operator) notFound();

  const { data: licenses } = await supabase
    .from("license_keys")
    .select("*")
    .eq("operator_id", id)
    .order("created_at", { ascending: false });

  const { data: machines } = await supabase
    .from("machines")
    .select("*")
    .eq("operator_id", id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/operators" className="text-muted-foreground hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{operator.name || "Unnamed"}</h1>
          <p className="text-sm text-muted-foreground">{operator.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {operator.is_distributor && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
              distributor
            </span>
          )}
          <TierBadge tier={operator.plan} />
        </div>
      </div>

      {/* Distributor toggle */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6 mb-6">
        <DistributorToggle
          operatorId={operator.id}
          isDistributor={operator.is_distributor ?? false}
          distributorTier={operator.distributor_tier}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            License Keys ({licenses?.length ?? 0})
          </h2>
          {licenses && licenses.length > 0 ? (
            <div className="space-y-2">
              {licenses.map((lic) => (
                <Link key={lic.id} href={`/licenses/${lic.id}`} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors">
                  <span className="font-mono text-sm text-foreground">
                    {lic.key}
                  </span>
                  <div className="flex items-center gap-2">
                    <TierBadge tier={lic.tier} />
                    <StatusBadge status={lic.is_activated ? "active" : "unbound"} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No license keys</p>
          )}
        </div>

        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            Machines ({machines?.length ?? 0})
          </h2>
          {machines && machines.length > 0 ? (
            <div className="space-y-2">
              {machines.map((m) => {
                const now = Date.now(); // eslint-disable-line react-hooks/purity
                const isOnline = m.last_seen_at &&
                  new Date(m.last_seen_at).getTime() > now - 5 * 60 * 1000;
                return (
                  <Link key={m.id} href={`/machines/${m.id}`} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name || m.machine_uuid.slice(0, 16)}</p>
                      <p className="text-xs text-muted-foreground">{m.hardware || "Unknown hardware"}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isOnline ? "text-emerald-400" : "text-zinc-500"}`}>
                      <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-zinc-600"}`} />
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No machines registered</p>
          )}
        </div>
      </div>
    </div>
  );
}
