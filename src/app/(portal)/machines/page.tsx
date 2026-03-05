import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    enterprise: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    pro: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    lite: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    trial: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${styles[tier] ?? styles.trial}`}>
      {tier}
    </span>
  );
}

export default async function MachinesPage() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) redirect("/signin");

  const supabase = await createClient();
  const isAdmin = ctx.role === "admin";

  let query = supabase
    .from("machines")
    .select("*, operators(name, email)")
    .order("last_seen_at", { ascending: false, nullsFirst: false });

  if (!isAdmin && ctx.operatorId) {
    query = query.eq("operator_id", ctx.operatorId);
  }

  const { data: machines } = await query;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Machines</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin ? "All registered devices across operators" : "Your registered devices"}
        </p>
      </div>

      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              {isAdmin && (
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Operator</th>
              )}
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Tier</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Hardware</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Version</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {machines?.map((m) => {
              const isOnline = m.last_seen_at &&
                new Date(m.last_seen_at).getTime() > Date.now() - 5 * 60 * 1000;
              return (
                <tr key={m.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-4 font-medium text-foreground">{m.name || m.machine_uuid.slice(0, 12)}</td>
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
                  <td className="px-5 py-4"><TierBadge tier={m.license_tier} /></td>
                  <td className="px-5 py-4 text-muted-foreground">{m.hardware || "-"}</td>
                  <td className="px-5 py-4 text-muted-foreground font-mono text-xs">{m.app_version || "-"}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {m.last_seen_at ? new Date(m.last_seen_at).toLocaleString() : "Never"}
                  </td>
                </tr>
              );
            })}
            {(!machines || machines.length === 0) && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-5 py-12 text-center text-muted-foreground">
                  No machines registered yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
