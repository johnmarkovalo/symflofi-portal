import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import LicenseTierManager from "./license-tier-manager";

export default async function LicenseTiersPage() {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") redirect("/licenses");

  const supabase = await createClient();

  const { data: tiers } = await supabase
    .from("license_tiers")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">License Tiers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage license pricing, features, and limits. Referenced by the landing page, license shop, and distributor pricing.
        </p>
      </div>

      <LicenseTierManager initialTiers={tiers ?? []} />
    </div>
  );
}
