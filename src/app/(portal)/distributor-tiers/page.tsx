import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import TierManager from "./tier-manager";

export default async function DistributorTiersPage() {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") redirect("/licenses");

  const supabase = await createClient();

  const { data: tiers } = await supabase
    .from("distributor_tiers")
    .select("*")
    .order("sort_order", { ascending: true });

  const { data: licenseTiers } = await supabase
    .from("license_tiers")
    .select("name, label, price_cents")
    .gt("price_cents", 0)
    .order("sort_order", { ascending: true });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Distributor Tiers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage wholesale discount tiers for distributors
        </p>
      </div>

      <TierManager initialTiers={tiers ?? []} licensePrices={licenseTiers ?? []} />
    </div>
  );
}
