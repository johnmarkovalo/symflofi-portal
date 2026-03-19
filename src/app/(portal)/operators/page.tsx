import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import Link from "next/link";
import OperatorTable from "./operator-table";

export default async function OperatorsPage() {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") redirect("/licenses");

  const supabase = await createClient();

  const { data: operators } = await supabase
    .from("operators")
    .select("*, license_keys(tier)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Operators</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage operator accounts</p>
        </div>
        <Link
          href="/operators/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Operator
        </Link>
      </div>

      <OperatorTable operators={(operators ?? []) as Parameters<typeof OperatorTable>[0]["operators"]} />
    </div>
  );
}
