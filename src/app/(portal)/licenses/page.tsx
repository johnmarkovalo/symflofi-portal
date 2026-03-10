import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import GenerateKeyButton from "./generate-key-button";
import LicenseTable from "./license-table";
import OperatorCodeChip from "@/components/operator-code-chip";

export default async function LicensesPage() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) redirect("/signin");

  const supabase = await createClient();
  const isAdmin = ctx.role === "admin";

  let query = supabase
    .from("license_keys")
    .select("*, operators(name, email), machines(id, machine_uuid, name)")
    .order("created_at", { ascending: false });

  if (!isAdmin && ctx.operatorId) {
    query = query.eq("operator_id", ctx.operatorId);
  }

  const { data: licenses } = await query;

  // Only admins can generate keys
  let operators: { id: string; name: string | null; email: string }[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("operators")
      .select("id, name, email")
      .order("name");
    operators = data ?? [];
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">License Keys</h1>
            {ctx.operatorCode && <OperatorCodeChip code={ctx.operatorCode} />}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Generate and manage license keys" : "Your license keys"}
          </p>
        </div>
        {isAdmin && <GenerateKeyButton operators={operators} />}
      </div>

      <LicenseTable
        licenses={(licenses ?? []) as Parameters<typeof LicenseTable>[0]["licenses"]}
        isAdmin={isAdmin}
        operatorId={ctx.operatorId ?? null}
      />
    </div>
  );
}
