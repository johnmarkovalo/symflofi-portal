import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import StatCard from "@/components/stat-card";
import ActivityFeed from "@/components/activity-feed";
import OperatorCodeChip from "@/components/operator-code-chip";

type OrderRow = {
  total_price_cents: number;
  paid_at: string;
  status: string;
};

type OrderItemRow = {
  tier_name: string;
  tier_label: string;
  quantity: number;
  line_total_cents: number;
};

type DistributorRow = {
  name: string;
  email: string;
  distributor_tier: string | null;
  distributor_discount_pct: number | null;
};

type DownloadRow = {
  board: string;
  file_type: string;
  created_at: string;
};

type MachineRow = {
  hardware: string | null;
  license_tier: string | null;
};

function formatCurrency(cents: number) {
  return `₱${(cents / 100).toLocaleString()}`;
}

export default async function DashboardPage() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) redirect("/signin");

  const supabase = await createClient();
  const isAdmin = ctx.role === "admin";

  if (isAdmin) {
    // Fetch all admin analytics data in parallel
    const [
      operators,
      licenses,
      activated,
      machines,
      pending,
      activities,
      paidOrders,
      orderItems,
      distributors,
      downloads,
      machineBoards,
    ] = await Promise.all([
      supabase.from("operators").select("*", { count: "exact", head: true }),
      supabase.from("license_keys").select("*", { count: "exact", head: true }),
      supabase.from("license_keys").select("*", { count: "exact", head: true }).eq("is_activated", true),
      supabase.from("machines").select("*", { count: "exact", head: true }),
      supabase.from("license_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("activity_log").select("id, event_type, description, created_at").order("created_at", { ascending: false }).limit(10),
      supabase.from("license_orders").select("total_price_cents, paid_at, status").eq("status", "paid"),
      supabase.from("license_order_items").select("tier_name, tier_label, quantity, line_total_cents, order_id, license_orders!inner(status)").eq("license_orders.status", "paid"),
      supabase.from("operators").select("name, email, distributor_tier, distributor_discount_pct").eq("is_distributor", true),
      supabase.from("firmware_downloads").select("board, file_type, created_at"),
      supabase.from("machines").select("hardware, license_tier").not("hardware", "is", null),
    ]);

    // --- Revenue analytics ---
    const orders = (paidOrders.data ?? []) as OrderRow[];
    const totalRevenue = orders.reduce((sum, o) => sum + o.total_price_cents, 0);
    const totalOrders = orders.length;

    // This month's revenue
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthRevenue = orders
      .filter((o) => o.paid_at && o.paid_at >= monthStart)
      .reduce((sum, o) => sum + o.total_price_cents, 0);
    const monthOrders = orders.filter((o) => o.paid_at && o.paid_at >= monthStart).length;

    // --- Tier breakdown ---
    const items = (orderItems.data ?? []) as OrderItemRow[];
    const tierSales: Record<string, { label: string; quantity: number; revenue: number }> = {};
    for (const item of items) {
      const existing = tierSales[item.tier_name];
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.line_total_cents;
      } else {
        tierSales[item.tier_name] = {
          label: item.tier_label,
          quantity: item.quantity,
          revenue: item.line_total_cents,
        };
      }
    }
    const tierBreakdown = Object.values(tierSales).sort((a, b) => b.revenue - a.revenue);

    // --- Distributor analytics ---
    const distList = (distributors.data ?? []) as DistributorRow[];
    const distributorCount = distList.length;
    const tierCounts: Record<string, number> = {};
    let totalDiscountImpact = 0;
    for (const d of distList) {
      const tier = d.distributor_tier ?? "none";
      tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;
      // Estimate discount impact: discount_pct represents % off on license requests
      if (d.distributor_discount_pct && d.distributor_discount_pct > 0) {
        totalDiscountImpact += d.distributor_discount_pct;
      }
    }
    const avgDiscount = distributorCount > 0 ? Math.round(totalDiscountImpact / distributorCount) : 0;

    // --- Downloads analytics ---
    const dlData = (downloads.data ?? []) as DownloadRow[];
    const totalDownloads = dlData.length;
    const monthDownloads = dlData.filter((d) => d.created_at >= monthStart).length;
    const boardCounts: Record<string, number> = {};
    for (const d of dlData) {
      boardCounts[d.board] = (boardCounts[d.board] ?? 0) + 1;
    }

    // --- Active boards analytics ---
    const boardData = (machineBoards.data ?? []) as MachineRow[];
    const activeBoardCounts: Record<string, { total: number; tiers: Record<string, number> }> = {};
    for (const m of boardData) {
      const board = m.hardware ?? "Unknown";
      const tier = m.license_tier ?? "unknown";
      if (!activeBoardCounts[board]) {
        activeBoardCounts[board] = { total: 0, tiers: {} };
      }
      activeBoardCounts[board].total += 1;
      activeBoardCounts[board].tiers[tier] = (activeBoardCounts[board].tiers[tier] ?? 0) + 1;
    }
    const activeBoardBreakdown = Object.entries(activeBoardCounts)
      .sort(([, a], [, b]) => b.total - a.total);
    const totalActiveBoards = boardData.length;

    // --- Stat cards ---
    const stats = [
      { label: "Total Revenue", value: formatCurrency(totalRevenue), subtitle: `${totalOrders} orders`, icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
      { label: "This Month", value: formatCurrency(monthRevenue), subtitle: `${monthOrders} orders`, icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
      { label: "Operators", value: operators.count ?? 0, subtitle: `${distributorCount} distributors`, icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
      { label: "License Keys", value: licenses.count ?? 0, subtitle: `${activated.count ?? 0} activated`, icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
      { label: "Machines", value: machines.count ?? 0, icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
      { label: "Pending Requests", value: pending.count ?? 0, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
      { label: "Downloads", value: totalDownloads, subtitle: `${monthDownloads} this month`, icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
    ];

    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your SymfloFi ecosystem</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Analytics panels */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Sales by Tier */}
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              Sales by Tier
            </h3>
            {tierBreakdown.length > 0 ? (
              <div className="space-y-3">
                {tierBreakdown.map((tier) => {
                  const pct = totalRevenue > 0 ? Math.round((tier.revenue / totalRevenue) * 100) : 0;
                  return (
                    <div key={tier.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-foreground font-medium capitalize">{tier.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{tier.quantity} sold</span>
                          <span className="text-sm font-semibold text-foreground">{formatCurrency(tier.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No sales data yet</p>
            )}
          </div>

          {/* Distributor Overview */}
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              Distributor Program
            </h3>
            {distributorCount > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-foreground">{distributorCount}</p>
                    <p className="text-[11px] text-muted-foreground">Distributors</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-foreground">{avgDiscount}%</p>
                    <p className="text-[11px] text-muted-foreground">Avg Discount</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-foreground">{Object.keys(tierCounts).length}</p>
                    <p className="text-[11px] text-muted-foreground">Active Tiers</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {Object.entries(tierCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([tier, count]) => (
                      <div key={tier} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            tier === "gold" ? "bg-amber-400" : tier === "silver" ? "bg-zinc-400" : "bg-orange-400"
                          }`} />
                          <span className="text-sm text-foreground capitalize">{tier}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No distributors yet</p>
            )}
          </div>

          {/* Downloads by Board */}
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Downloads by Board
            </h3>
            {totalDownloads > 0 ? (
              <div className="space-y-3">
                {Object.entries(boardCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([board, count]) => {
                    const pct = Math.round((count / totalDownloads) * 100);
                    return (
                      <div key={board}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-foreground font-medium">{board}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{pct}%</span>
                            <span className="text-sm font-semibold text-foreground">{count}</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No download data yet</p>
            )}
          </div>

          {/* Active Boards (by license activation) */}
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Active Boards
            </h3>
            {activeBoardBreakdown.length > 0 ? (
              <div className="space-y-4">
                {activeBoardBreakdown.map(([board, data]) => {
                  const pct = totalActiveBoards > 0 ? Math.round((data.total / totalActiveBoards) * 100) : 0;
                  return (
                    <div key={board}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-foreground font-medium">{board}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                          <span className="text-sm font-semibold text-foreground">{data.total}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(data.tiers)
                          .sort(([, a], [, b]) => b - a)
                          .map(([tier, count]) => (
                            <span key={tier} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                              {tier}: {count}
                            </span>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No activated machines yet</p>
            )}
          </div>

          {/* Recent Activity */}
          <ActivityFeed activities={activities.data ?? []} />
        </div>
      </div>
    );
  }

  // Operator view (includes distributors — they're operators too)
  const operatorId = ctx.operatorId!;

  const [machinesRes, onlineMachinesRes, licensesRes, activatedRes, activities] = await Promise.all([
    supabase.from("machines").select("*", { count: "exact", head: true }).eq("operator_id", operatorId),
    supabase.from("machines").select("last_seen_at").eq("operator_id", operatorId),
    supabase.from("license_keys").select("*", { count: "exact", head: true }).eq("operator_id", operatorId),
    supabase.from("license_keys").select("*", { count: "exact", head: true }).eq("operator_id", operatorId).eq("is_activated", true),
    supabase.from("activity_log").select("id, event_type, description, created_at").eq("operator_id", operatorId).order("created_at", { ascending: false }).limit(10),
  ]);

  const now = Date.now(); // eslint-disable-line react-hooks/purity
  const onlineCount = (onlineMachinesRes.data ?? []).filter(
    (m) => m.last_seen_at && new Date(m.last_seen_at).getTime() > now - 5 * 60 * 1000
  ).length;
  const totalMachines = machinesRes.count ?? 0;
  const totalLicenses = licensesRes.count ?? 0;
  const activatedCount = activatedRes.count ?? 0;

  const stats = [
    { label: "Machines Online", value: onlineCount, subtitle: `${totalMachines - onlineCount} offline`, icon: "M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "Total Machines", value: totalMachines, icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { label: "License Keys", value: totalLicenses, subtitle: `${activatedCount} activated`, icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { label: "Available Keys", value: totalLicenses - activatedCount, icon: "M12 4.5v15m7.5-7.5h-15", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your SymfloFi overview</p>
        </div>
        {ctx.operatorCode && <OperatorCodeChip code={ctx.operatorCode} />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <ActivityFeed activities={activities.data ?? []} />
    </div>
  );
}
