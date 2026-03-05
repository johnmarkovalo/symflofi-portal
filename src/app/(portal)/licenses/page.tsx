import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import GenerateKeyButton from "./generate-key-button";

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

function StatusBadge({ activated }: { activated: boolean }) {
  return activated ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
      activated
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">
      unbound
    </span>
  );
}

export default async function LicensesPage() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) redirect("/login");

  const supabase = await createClient();
  const isAdmin = ctx.role === "admin";

  let query = supabase
    .from("license_keys")
    .select("*, operators(name, email)")
    .order("created_at", { ascending: false });

  if (!isAdmin && ctx.operatorId) {
    query = query.eq("operator_id", ctx.operatorId);
  }

  const { data: licenses } = await query;

  // Only admins can generate keys
  let operators: { id: string; name: string | null; email: string }[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("operators")
      .select("id, name, email")
      .order("name");
    operators = data ?? [];
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">License Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Generate and manage license keys" : "Your license keys"}
          </p>
        </div>
        {isAdmin && <GenerateKeyButton operators={operators} />}
      </div>

      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Key</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Tier</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              {isAdmin && (
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Operator</th>
              )}
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Machine</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody>
            {licenses?.map((lic) => (
              <tr key={lic.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                <td className="px-5 py-4 font-mono text-sm text-foreground">{lic.key}</td>
                <td className="px-5 py-4"><TierBadge tier={lic.tier} /></td>
                <td className="px-5 py-4"><StatusBadge activated={lic.is_activated} /></td>
                {isAdmin && (
                  <td className="px-5 py-4 text-muted-foreground">
                    {lic.operators?.name || lic.operators?.email || "-"}
                  </td>
                )}
                <td className="px-5 py-4 text-muted-foreground font-mono text-xs">
                  {lic.machine_id ? "Bound" : "Unbound"}
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {new Date(lic.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {(!licenses || licenses.length === 0) && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-5 py-12 text-center text-muted-foreground">
                  No license keys yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
