import { createClient } from "@/lib/supabase/server";
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    unbound: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    expired: "bg-red-500/10 text-red-400 border-red-500/20",
    revoked: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${styles[status] ?? styles.revoked}`}>
      {status}
    </span>
  );
}

export default async function LicensesPage() {
  const supabase = await createClient();

  const { data: licenses } = await supabase
    .from("license_keys")
    .select("*, operators(name, email)")
    .order("created_at", { ascending: false });

  const { data: operators } = await supabase
    .from("operators")
    .select("id, name, email")
    .order("name");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">License Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate and manage license keys</p>
        </div>
        <GenerateKeyButton operators={operators ?? []} />
      </div>

      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Key</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Tier</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Operator</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Machine</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Expires</th>
            </tr>
          </thead>
          <tbody>
            {licenses?.map((lic) => (
              <tr key={lic.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                <td className="px-5 py-4 font-mono text-sm text-foreground">{lic.key}</td>
                <td className="px-5 py-4"><TierBadge tier={lic.tier} /></td>
                <td className="px-5 py-4"><StatusBadge status={lic.status} /></td>
                <td className="px-5 py-4 text-muted-foreground">
                  {lic.operators?.name || lic.operators?.email || "-"}
                </td>
                <td className="px-5 py-4 text-muted-foreground font-mono text-xs">
                  {lic.bound_machine_uuid ? lic.bound_machine_uuid.slice(0, 20) + "..." : "Unbound"}
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : "Never"}
                </td>
              </tr>
            ))}
            {(!licenses || licenses.length === 0) && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
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
