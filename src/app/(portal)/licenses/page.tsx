import { createClient } from "@/lib/supabase/server";
import GenerateKeyButton from "./generate-key-button";

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
        <h1 className="text-2xl font-bold text-gray-900">License Keys</h1>
        <GenerateKeyButton operators={operators ?? []} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500">Key</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Tier</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Operator</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Machine</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Expires</th>
            </tr>
          </thead>
          <tbody>
            {licenses?.map((lic) => (
              <tr key={lic.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm text-gray-900">{lic.key}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    lic.tier === "enterprise" ? "bg-purple-100 text-purple-700" :
                    lic.tier === "pro" ? "bg-blue-100 text-blue-700" :
                    lic.tier === "lite" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {lic.tier}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    lic.status === "active" ? "bg-green-100 text-green-700" :
                    lic.status === "unbound" ? "bg-yellow-100 text-yellow-700" :
                    lic.status === "expired" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {lic.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {lic.operators?.name || lic.operators?.email || "-"}
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                  {lic.bound_machine_uuid ? lic.bound_machine_uuid.slice(0, 16) + "..." : "Unbound"}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : "Never"}
                </td>
              </tr>
            ))}
            {(!licenses || licenses.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
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
