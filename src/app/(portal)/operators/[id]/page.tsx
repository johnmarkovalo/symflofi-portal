import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function OperatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: operator } = await supabase
    .from("operators")
    .select("*")
    .eq("id", id)
    .single();

  if (!operator) notFound();

  const { data: licenses } = await supabase
    .from("license_keys")
    .select("*")
    .eq("operator_id", id)
    .order("created_at", { ascending: false });

  const { data: machines } = await supabase
    .from("machines")
    .select("*")
    .eq("operator_id", id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/operators" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{operator.name || "Unnamed"}</h1>
          <p className="text-sm text-gray-500">{operator.email}</p>
        </div>
        <span className={`ml-auto inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          operator.plan === "enterprise" ? "bg-purple-100 text-purple-700" :
          operator.plan === "pro" ? "bg-blue-100 text-blue-700" :
          operator.plan === "lite" ? "bg-green-100 text-green-700" :
          "bg-gray-100 text-gray-700"
        }`}>
          {operator.plan}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">License Keys ({licenses?.length ?? 0})</h2>
          {licenses && licenses.length > 0 ? (
            <div className="space-y-2">
              {licenses.map((lic) => (
                <div key={lic.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="font-mono text-sm">{lic.key}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      lic.tier === "pro" ? "bg-blue-100 text-blue-700" :
                      lic.tier === "lite" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>{lic.tier}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      lic.status === "active" ? "bg-green-100 text-green-700" :
                      lic.status === "unbound" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>{lic.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No license keys</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Machines ({machines?.length ?? 0})</h2>
          {machines && machines.length > 0 ? (
            <div className="space-y-2">
              {machines.map((m) => {
                const isOnline = m.last_seen_at &&
                  new Date(m.last_seen_at).getTime() > Date.now() - 5 * 60 * 1000;
                return (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.name || m.machine_uuid.slice(0, 16)}</p>
                      <p className="text-xs text-gray-500">{m.hardware || "Unknown hardware"}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isOnline ? "text-green-600" : "text-gray-400"}`}>
                      <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-300"}`} />
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No machines registered</p>
          )}
        </div>
      </div>
    </div>
  );
}
