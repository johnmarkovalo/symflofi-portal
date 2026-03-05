import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function OperatorsPage() {
  const supabase = await createClient();

  const { data: operators } = await supabase
    .from("operators")
    .select("*, license_keys(count)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Operators</h1>
        <Link
          href="/operators/new"
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Add Operator
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Licenses</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
            </tr>
          </thead>
          <tbody>
            {operators?.map((op) => (
              <tr key={op.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link href={`/operators/${op.id}`} className="hover:text-blue-600">
                    {op.name || "Unnamed"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{op.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    op.plan === "enterprise" ? "bg-purple-100 text-purple-700" :
                    op.plan === "pro" ? "bg-blue-100 text-blue-700" :
                    op.plan === "lite" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {op.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{op.license_keys?.[0]?.count ?? 0}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(op.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {(!operators || operators.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
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
