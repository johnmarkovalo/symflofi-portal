import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import AuditLogTable from "./audit-log-table";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string; search?: string; page?: string }>;
}) {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") redirect("/licenses");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const perPage = 50;
  const offset = (page - 1) * perPage;

  const supabase = await createClient();

  let query = supabase
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.action) {
    query = query.eq("action", params.action);
  }
  if (params.entity) {
    query = query.eq("entity_type", params.entity);
  }
  if (params.search) {
    query = query.ilike("summary", `%${params.search}%`);
  }

  const { data: logs, count } = await query;

  // Get distinct action values for filter dropdown
  const { data: actionValues } = await supabase
    .from("admin_audit_log")
    .select("action")
    .order("action");

  const uniqueActions = [...new Set((actionValues ?? []).map((a) => a.action))];

  const totalPages = Math.ceil((count ?? 0) / perPage);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete history of all admin actions for transparency and accountability
        </p>
      </div>

      <AuditLogTable
        logs={logs ?? []}
        actions={uniqueActions}
        currentPage={page}
        totalPages={totalPages}
        totalCount={count ?? 0}
        filters={{
          action: params.action ?? "",
          entity: params.entity ?? "",
          search: params.search ?? "",
        }}
      />
    </div>
  );
}
