import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
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

export default async function OperatorsPage() {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") redirect("/licenses");

  const supabase = await createClient();

  const { data: operators } = await supabase
    .from("operators")
    .select("*, license_keys(tier)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Operators</h1>
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

      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
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
            {operators?.map((op) => (
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
                        (op.license_keys as { tier: string }[]).reduce<Record<string, number>>((acc, k) => {
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
