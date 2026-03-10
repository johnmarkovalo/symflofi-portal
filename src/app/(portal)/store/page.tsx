import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import StorePlans from "./store-plans";

type LicenseTier = {
  name: string;
  label: string;
  price_cents: number;
  duration_days: number;
  max_concurrent_users: number | null;
  max_sub_vendos: number;
  pppoe_enabled: boolean;
  cloud_dashboard: boolean;
  sales_history_days: number;
  is_highlighted: boolean;
  support_level: string;
};

function formatTierPrice(cents: number) {
  if (cents === 0) return "Free";
  return `₱${(cents / 100).toLocaleString()}`;
}

function buildFeatureList(tier: LicenseTier): string[] {
  const features: string[] = [];
  const users = tier.max_concurrent_users;
  features.push(
    users === null || users === -1
      ? "Unlimited concurrent users"
      : `${users} concurrent users`,
  );
  if (tier.pppoe_enabled) features.push("PPPoE subscriber plans");
  if (tier.cloud_dashboard) features.push("Cloud dashboard & monitoring");
  if (tier.max_sub_vendos !== 0)
    features.push(
      tier.max_sub_vendos === -1
        ? "Sub-vendor accounts"
        : `${tier.max_sub_vendos} sub-vendors`,
    );
  const hist = tier.sales_history_days;
  features.push(
    hist === -1
      ? "Unlimited sales history"
      : `${hist} day${hist !== 1 ? "s" : ""} sales history`,
  );
  if (tier.support_level === "priority") features.push("Priority support");
  return features;
}

export default async function StorePage() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) redirect("/signin");

  const supabase = await createClient();

  const { data: tiers } = await supabase
    .from("license_tiers")
    .select("*")
    .eq("is_public", true)
    .order("sort_order", { ascending: true });

  const plans = (tiers ?? []).map((tier: LicenseTier) => ({
    name: tier.name,
    label: tier.label,
    price: formatTierPrice(tier.price_cents),
    priceCents: tier.price_cents,
    period:
      tier.price_cents > 0 && tier.duration_days === 365
        ? "/year"
        : tier.price_cents > 0
          ? `/${tier.duration_days}d`
          : "",
    durationDays: tier.duration_days,
    features: buildFeatureList(tier),
    highlight: tier.is_highlighted,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">License Store</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Purchase license keys for your piso WiFi machines
        </p>
      </div>

      <StorePlans plans={plans} />
    </div>
  );
}
