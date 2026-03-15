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

  // Look up distributor info for this operator
  let discountPct = 0;
  let currentDistributorTier: string | null = null;
  let isDistributor = false;
  if (ctx.operatorId) {
    const { data: operator } = await supabase
      .from("operators")
      .select("is_distributor, distributor_discount_pct, distributor_tier")
      .eq("id", ctx.operatorId)
      .single();

    if (operator?.is_distributor) {
      isDistributor = true;
      currentDistributorTier = operator.distributor_tier;
      if (operator.distributor_discount_pct > 0) {
        discountPct = operator.distributor_discount_pct;
      }
    }
  }

  const [{ data: tiers }, { data: distributorTiers }] = await Promise.all([
    supabase
      .from("license_tiers")
      .select("*")
      .eq("is_public", true)
      .gt("price_cents", 0)
      .order("product", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("distributor_tiers")
      .select("name, label, discount_pct, min_licenses, bonus_licenses, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  const plans = (tiers ?? []).map((tier: LicenseTier) => {
    const discountedCents = discountPct > 0
      ? Math.round(tier.price_cents * (1 - discountPct / 100))
      : tier.price_cents;

    return {
      name: tier.name,
      label: tier.label,
      product: (tier as Record<string, unknown>).product as string ?? "symflofi",
      price: formatTierPrice(discountedCents),
      priceCents: discountedCents,
      originalPriceCents: discountPct > 0 ? tier.price_cents : undefined,
      originalPrice: discountPct > 0 ? formatTierPrice(tier.price_cents) : undefined,
      period:
        tier.price_cents > 0 && tier.duration_days === 365
          ? "/year"
          : tier.price_cents > 0
            ? `/${tier.duration_days}d`
            : "",
      durationDays: tier.duration_days,
      features: buildFeatureList(tier),
      highlight: tier.is_highlighted,
    };
  });

  const bulkPackages = (distributorTiers ?? []).map((dt) => ({
    tierName: dt.name as string,
    tierLabel: dt.label as string,
    baseQuantity: dt.min_licenses as number,
    bonusQuantity: dt.bonus_licenses as number,
    totalQuantity: (dt.min_licenses as number) + (dt.bonus_licenses as number),
    discountPct: dt.discount_pct as number,
  }));

  const licenseTierPrices = (tiers ?? []).map((t: LicenseTier) => ({
    name: t.name,
    label: t.label,
    priceCents: t.price_cents,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">License Store</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Purchase license keys for your piso WiFi machines
        </p>
        {discountPct > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            <span className="text-sm font-semibold text-emerald-400">{discountPct}% Distributor Discount Applied</span>
          </div>
        )}
      </div>

      <StorePlans
        plans={plans}
        bulkPackages={bulkPackages}
        licenseTierPrices={licenseTierPrices}
        isDistributor={isDistributor}
        currentDistributorTier={currentDistributorTier}
        operatorDiscountPct={discountPct}
      />
    </div>
  );
}
