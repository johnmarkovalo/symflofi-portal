import { createClient } from "@/lib/supabase/server";

export default async function MachinesPage() {
  const supabase = await createClient();

  const { data: machines } = await supabase
    .from("machines")
    .select("*, operators(name, email)")
    .order("last_seen_at", { ascending: false, nullsFirst: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Machines</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Operator</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Tier</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Hardware</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Version</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {machines?.map((m) => {
              const isOnline = m.last_seen_at &&
                new Date(m.last_seen_at).getTime() > Date.now() - 5 * 60 * 1000;
              return (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{m.name || m.machine_uuid.slice(0, 12)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isOnline ? "text-green-600" : "text-gray-400"}`}>
                      <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-300"}`} />
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {m.operators?.name || m.operators?.email || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.license_tier === "enterprise" ? "bg-purple-100 text-purple-700" :
                      m.license_tier === "pro" ? "bg-blue-100 text-blue-700" :
                      m.license_tier === "lite" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {m.license_tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{m.hardware || "-"}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{m.app_version || "-"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {m.last_seen_at ? new Date(m.last_seen_at).toLocaleString() : "Never"}
                  </td>
                </tr>
              );
            })}
            {(!machines || machines.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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
