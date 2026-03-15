import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import MachineProductFilter from "./machine-product-filter";

export default async function MachinesPage() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) redirect("/signin");

  const supabase = await createClient();
  const isAdmin = ctx.role === "admin";

  let query = supabase
    .from("machines")
    .select("*, product, operators(name, email)")
    .neq("status", "decommissioned")
    .order("last_seen_at", { ascending: false, nullsFirst: false });

  if (!isAdmin && ctx.operatorId) {
    query = query.eq("operator_id", ctx.operatorId);
  }

  const { data: machines } = await query;

  const now = Date.now(); // eslint-disable-line react-hooks/purity
  const onlineCount = (machines ?? []).filter(
    (m) => m.last_seen_at && new Date(m.last_seen_at).getTime() > now - 5 * 60 * 1000
  ).length;
  const offlineCount = (machines ?? []).length - onlineCount;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Machines</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "All registered devices across operators" : "Your registered devices"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            {onlineCount} Online
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <span className="w-2 h-2 rounded-full bg-zinc-600" />
            {offlineCount} Offline
          </span>
        </div>
      </div>

      <MachineProductFilter machines={machines ?? []} isAdmin={isAdmin} />
    </div>
  );
}
