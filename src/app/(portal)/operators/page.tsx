import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import Link from "next/link";

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

export default async function OperatorsPage() {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") redirect("/licenses");

  const supabase = await createClient();

  const { data: operators } = await supabase
    .from("operators")
    .select("*, license_keys(count)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operators</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage operator accounts</p>
        </div>
        <Link
          href="/operators/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Operator
        </Link>
      </div>

      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Email</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Plan</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Licenses</th>
              <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody>
            {operators?.map((op) => (
              <tr key={op.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                <td className="px-5 py-4 font-medium text-foreground">
                  <Link href={`/operators/${op.id}`} className="hover:text-primary transition-colors">
                    {op.name || "Unnamed"}
                  </Link>
                </td>
                <td className="px-5 py-4 text-muted-foreground">{op.email}</td>
                <td className="px-5 py-4"><TierBadge tier={op.plan} /></td>
                <td className="px-5 py-4 text-muted-foreground">{op.license_keys?.[0]?.count ?? 0}</td>
                <td className="px-5 py-4 text-muted-foreground">
                  {new Date(op.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {(!operators || operators.length === 0) && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                  No operators yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
