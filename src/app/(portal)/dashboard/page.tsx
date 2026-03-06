import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import StatCard from "@/components/stat-card";
import ActivityFeed from "@/components/activity-feed";

export default async function DashboardPage() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) redirect("/signin");

  const supabase = await createClient();
  const isAdmin = ctx.role === "admin";

  if (isAdmin) {
    const [operators, licenses, activated, machines, pending, activities] = await Promise.all([
      supabase.from("operators").select("*", { count: "exact", head: true }),
      supabase.from("license_keys").select("*", { count: "exact", head: true }),
      supabase.from("license_keys").select("*", { count: "exact", head: true }).eq("is_activated", true),
      supabase.from("machines").select("*", { count: "exact", head: true }),
      supabase.from("license_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("activity_log").select("id, event_type, description, created_at").order("created_at", { ascending: false }).limit(10),
    ]);

    const stats = [
      { label: "Operators", value: operators.count ?? 0, icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
      { label: "License Keys", value: licenses.count ?? 0, icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
      { label: "Activated", value: activated.count ?? 0, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
      { label: "Machines", value: machines.count ?? 0, icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
      { label: "Pending Requests", value: pending.count ?? 0, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
    ];

    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your SymfloFi ecosystem</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <ActivityFeed activities={activities.data ?? []} />
      </div>
    );
  }

  // Operator view
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

  const stats = [
    { label: "Machines Online", value: onlineCount, subtitle: `${totalMachines - onlineCount} offline`, icon: "M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "Total Machines", value: totalMachines, icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { label: "License Keys", value: licensesRes.count ?? 0, subtitle: `${activatedRes.count ?? 0} activated`, icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { label: "Available Keys", value: (licensesRes.count ?? 0) - (activatedRes.count ?? 0), icon: "M12 4.5v15m7.5-7.5h-15", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your SymfloFi overview</p>
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
