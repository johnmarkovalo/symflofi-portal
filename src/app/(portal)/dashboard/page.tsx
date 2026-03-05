import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { count: operatorCount } = await supabase
    .from("operators")
    .select("*", { count: "exact", head: true });

  const { count: licenseCount } = await supabase
    .from("license_keys")
    .select("*", { count: "exact", head: true });

  const { count: machineCount } = await supabase
    .from("machines")
    .select("*", { count: "exact", head: true });

  const { count: activeCount } = await supabase
    .from("license_keys")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const stats = [
    { label: "Operators", value: operatorCount ?? 0 },
    { label: "License Keys", value: licenseCount ?? 0 },
    { label: "Active Licenses", value: activeCount ?? 0 },
    { label: "Machines", value: machineCount ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
