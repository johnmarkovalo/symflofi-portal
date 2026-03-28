import Link from "next/link";
import Image from "next/image";
import PublicNav from "@/components/public-nav";
import { createClient } from "@/lib/supabase/server";
import {
  SymfloFiPricing,
  PlayTabPricing,
  SymfloWISPPricing,
  type PlanData,
} from "@/components/pricing-section";

const features = [
  {
    title: "Captive Portal & Branding",
    description:
      "Customizable login page with your logo and branding. Customers connect, pay, and get online instantly.",
    icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
  },
  {
    title: "Coin & Voucher Payments",
    description:
      "Accept coins via coin slot and sell printed vouchers. Flexible payment options for every walk-in customer.",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Bandwidth & Session Control",
    description:
      "SQM-based traffic shaping, per-user bandwidth limits, and time-based session billing with auto-disconnect.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    title: "PPPoE Subscriber Plans",
    description:
      "Sell monthly internet plans with username/password authentication. Per-subscriber speed limits and automatic expiry.",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    title: "RADIUS Authentication",
    description:
      "Enterprise-grade RADIUS server for centralized subscriber management, accounting, and access control.",
    icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  },
  {
    title: "MWAN3 Load Balancing",
    description:
      "Multi-WAN failover and load balancing. Keep your machines online with automatic ISP switching.",
    icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
  },
  {
    title: "Spin Wheel & Promos",
    description:
      "Engage customers with spin-the-wheel promotions, promo rates, and scheduled discounts to drive repeat visits.",
    icon: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99",
  },
  {
    title: "E-Loading Integration",
    description:
      "Offer prepaid e-loading services directly from your Piso WiFi machine. Additional revenue stream with zero extra hardware.",
    icon: "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3",
  },
  {
    title: "SNMP Monitoring",
    description:
      "Monitor network devices, track bandwidth usage, and detect issues proactively with SNMP polling and alerts.",
    icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5",
  },
  {
    title: "Cloud Dashboard",
    description:
      "Issue licenses, track device status, app versions, and hardware info in real-time from anywhere.",
    icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
  },
  {
    title: "Sales Reports & Analytics",
    description:
      "Track revenue, monitor sales trends by tier, and view per-machine earnings with detailed reporting dashboards.",
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  },
  {
    title: "Remote Access & OTA",
    description:
      "Manage your machines remotely via secure VPN tunnel. Push firmware updates over-the-air with one click.",
    icon: "M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25",
  },
];

const hardware = [
  { name: "Orange Pi One", arch: "ARMv7 · Sunxi", recommended: true },
  {
    name: "Orange Pi Zero 3",
    arch: "ARM64 · Allwinner H618",
    recommended: false,
  },
  { name: "Raspberry Pi 3/4", arch: "ARM64 · Broadcom", recommended: false },
];

type LicenseTier = {
  name: string;
  label: string;
  price_cents: number;
  duration_days: number;
  max_concurrent_users: number | null;
  max_vouchers_per_month: number | null;
  max_sub_vendos: number;
  epayment_enabled: boolean;
  cloud_dashboard: boolean;
  remote_access: boolean;
  pppoe_enabled: boolean;
  sales_history_days: number;
  is_highlighted: boolean;
  support_level: string;
  features: Record<string, unknown>;
  radius_enabled: boolean;
  snmp_enabled: boolean;
  spinwheel_enabled: boolean;
  mwan_enabled: boolean;
  promo_rates_enabled: boolean;
  sub_accounts_enabled: boolean;
  eloading_enabled: boolean;
};

function formatTierPrice(cents: number) {
  if (cents === 0) return "Free";
  return `₱${(cents / 100).toLocaleString("en-PH")}`;
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
  if (tier.radius_enabled) features.push("RADIUS authentication");
  if (tier.snmp_enabled) features.push("SNMP monitoring");
  if (tier.mwan_enabled) features.push("MWAN3 load balancing");
  if (tier.spinwheel_enabled) features.push("Spin wheel promotions");
  if (tier.promo_rates_enabled) features.push("Promo rates & scheduling");
  if (tier.eloading_enabled) features.push("E-loading integration");
  if (tier.sub_accounts_enabled) features.push("Sub-accounts");
  if (tier.cloud_dashboard) features.push("Cloud dashboard & monitoring");
  if (tier.remote_access) features.push("Remote access & OTA updates");
  if (tier.max_sub_vendos !== 0 && !tier.sub_accounts_enabled)
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

function buildPlayTabFeatureList(tier: LicenseTier): string[] {
  const list: string[] = [];
  const f = tier.features ?? {};
  list.push("Coin-operated timer system");
  if (f.kiosk_mode) list.push("Kiosk mode & device lockdown");
  if (f.app_whitelisting) list.push("App whitelisting");
  if (f.deep_freeze) list.push("Deep freeze mode");
  if (f.theming) list.push("Theme & branding customization");
  if (tier.cloud_dashboard) list.push("Cloud dashboard & monitoring");
  if (tier.remote_access) list.push("Remote device management");
  if (f.ota_updates) list.push("In-app OTA updates");
  const hist = tier.sales_history_days;
  list.push(
    hist === -1
      ? "Unlimited session history"
      : `${hist} day${hist !== 1 ? "s" : ""} session history`,
  );
  if (tier.support_level === "priority") list.push("Priority support");
  if (tier.name === "playtab_business") list.push("Requires SymfloFi Business plan");
  return list;
}

const stats = [
  { value: "500+", label: "Active Machines" },
  { value: "50+", label: "Operators" },
  { value: "99.9%", label: "Uptime" },
];

export default async function LandingPage() {
  const supabase = await createClient();

  // Try fetching with product filter; fall back to unfiltered if column doesn't exist yet
  let tiers: LicenseTier[] | null = null;
  let playtabTiers: LicenseTier[] | null = null;
  let wispTiers: LicenseTier[] | null = null;

  const { data: sfTiers, error: sfErr } = await supabase
    .from("license_tiers")
    .select("*")
    .eq("is_public", true)
    .eq("product", "symflofi")
    .order("sort_order", { ascending: true });

  if (sfErr || (sfTiers && sfTiers.length === 0)) {
    // product column may not exist yet — fall back to fetching all public tiers
    const { data: allTiers } = await supabase
      .from("license_tiers")
      .select("*")
      .eq("is_public", true)
      .order("sort_order", { ascending: true });
    tiers = allTiers;
  } else {
    tiers = sfTiers;
    // Only try PlayTab query if the product column exists
    const { data: ptTiers } = await supabase
      .from("license_tiers")
      .select("*")
      .eq("is_public", true)
      .eq("product", "playtab")
      .order("sort_order", { ascending: true });
    playtabTiers = ptTiers;
    // SymfloWISP tiers
    const { data: wTiers } = await supabase
      .from("license_tiers")
      .select("*")
      .eq("is_public", true)
      .eq("product", "symflowisp")
      .order("sort_order", { ascending: true });
    wispTiers = wTiers;
  }

  // Bulk discount: 20% off for 50+ licenses
  const BULK_DISCOUNT = 0.2;
  const BULK_QTY = 50;

  function buildPlanData(tier: LicenseTier, product: "symflofi" | "playtab" | "symflowisp"): PlanData {
    const isFree = tier.price_cents === 0;
    const bulkUnitCents = isFree ? 0 : Math.round(tier.price_cents * (1 - BULK_DISCOUNT));
    const savingsCents = tier.price_cents - bulkUnitCents;
    return {
      name: tier.label,
      price: formatTierPrice(tier.price_cents),
      period: isFree
        ? ""
        : tier.duration_days === 365
          ? "/year"
          : `/${tier.duration_days}d`,
      bulkPrice: isFree ? "Free" : formatTierPrice(bulkUnitCents),
      bulkSavings: isFree ? "" : formatTierPrice(savingsCents),
      bulkQty: isFree ? 0 : BULK_QTY,
      features:
        product === "playtab"
          ? buildPlayTabFeatureList(tier)
          : buildFeatureList(tier),
      cta: isFree ? "Get Started" : `Get ${tier.label} License`,
      highlight: tier.is_highlighted,
    };
  }

  const plans: PlanData[] = (tiers ?? []).filter((t: LicenseTier) => t.price_cents > 0).map((t: LicenseTier) => buildPlanData(t, "symflofi"));
  const playtabPlans: PlanData[] = (playtabTiers ?? []).map((t: LicenseTier) => buildPlanData(t, "playtab"));
  const wispPlans: PlanData[] = (wispTiers ?? []).map((t: LicenseTier) => buildPlanData(t, "symflowisp"));

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-30%] right-[-15%] w-[800px] h-[800px] rounded-full blur-3xl animate-pulse-glow"
          style={{
            background:
              "linear-gradient(to bottom left, oklch(0.5 0.22 270), oklch(0.3 0.15 300))",
          }}
        />
        <div
          className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-3xl animate-pulse-glow"
          style={{
            background:
              "linear-gradient(to top right, oklch(0.45 0.18 250), oklch(0.3 0.12 220))",
            animationDelay: "2s",
          }}
        />
      </div>

      <PublicNav />

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-24 sm:pb-20 md:pt-32 md:pb-28">
        <div className="text-center max-w-3xl mx-auto">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Cloud-Managed Vending Platform
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] animate-fade-in-up delay-100">
            The{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              SymfloFi
            </span>{" "}
            Platform
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-muted-foreground/80 max-w-2xl mx-auto animate-fade-in-up delay-150">
            Piso WiFi &middot; WISP &middot; PlayTab Gaming &middot; Cloud-Managed
          </p>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in-up delay-200">
            From Piso WiFi machines to coin-operated gaming tablets &mdash;
            manage, monitor, and monetize your vending devices from one SymfloFi cloud platform.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40"
            >
              Get Started Free
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-all"
            >
              Learn More
            </a>
          </div>

          {/* Stats */}
          <div className="mt-12 sm:mt-16 grid grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto animate-fade-in-up delay-400">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section
        id="products"
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20"
      >
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            SymfloFi Products
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm sm:text-base">
            Three products, one cloud platform. Choose what fits your business.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          <a
            href="#features"
            className="group p-6 sm:p-8 rounded-2xl bg-card/60 backdrop-blur-sm border border-border hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/15 transition-colors">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">SymfloFi</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Piso WiFi vending system with coin slot support, captive portal, bandwidth management, voucher system, and cloud monitoring.
            </p>
          </a>
          <a
            href="#features"
            className="group p-6 sm:p-8 rounded-2xl bg-card/60 backdrop-blur-sm border border-border hover:border-cyan-500/30 transition-all hover:shadow-lg hover:shadow-cyan-500/5"
          >
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500/15 transition-colors">
              <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">SymfloFi WISP</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Full ISP management with RADIUS authentication, PPPoE subscriber plans, MWAN3 load balancing, and SNMP network monitoring.
            </p>
          </a>
          <div className="group p-6 sm:p-8 rounded-2xl bg-card/60 backdrop-blur-sm border border-border hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/15 transition-colors">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">PlayTab</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Coin-operated tablet gaming kiosk. Accept coins, manage game sessions, track usage, and monitor devices remotely.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20"
      >
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Advanced Features
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm sm:text-base">
            Everything you need to run a Piso WiFi or WISP business, from coin slots
            to RADIUS and cloud dashboards.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-5 sm:p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={f.icon}
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Hardware */}
      <section
        id="hardware"
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20"
      >
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Supported Hardware
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm sm:text-base">
            Pre-built firmware images ready to flash. Just download, write to SD
            card, and boot.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 max-w-4xl mx-auto">
          {hardware.map((hw) => (
            <Link
              key={hw.name}
              href="/downloads"
              className={`relative p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer ${
                hw.recommended
                  ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20"
                  : "bg-card/60 backdrop-blur-sm border-border hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
              }`}
            >
              {hw.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                  Recommended
                </div>
              )}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{hw.name}</h3>
                  <p className="text-xs text-muted-foreground">{hw.arch}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20"
      >
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            License Plans
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm sm:text-base">
            Start free, upgrade when you are ready. All plans include OTA
            updates.
          </p>
        </div>

        <SymfloFiPricing plans={plans} />

        {playtabPlans.length > 0 && (
          <PlayTabPricing plans={playtabPlans} />
        )}

        {wispPlans.length > 0 && (
          <SymfloWISPPricing plans={wispPlans} />
        )}
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="relative rounded-3xl border border-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10" />
          <div className="relative px-6 py-12 sm:px-8 sm:py-16 md:px-16 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm sm:text-base">
              Sign up as an operator, flash the firmware, and start earning in
              minutes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
              >
                Create Free Account
              </Link>
              <Link
                href="/signin"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image
                  src="/logo-icon.png"
                  alt="SymfloFi"
                  width={28}
                  height={28}
                  className="rounded-lg"
                />
                <span className="text-sm font-bold">SymfloFi</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cloud-managed vending platform.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Product
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#products"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    SymfloFi
                  </a>
                </li>
                <li>
                  <a
                    href="#products"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    PlayTab
                  </a>
                </li>
                <li>
                  <a
                    href="#features"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#hardware"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Hardware
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Resources
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/signup"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Get Started
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signin"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Operator Portal
                  </Link>
                </li>
                <li>
                  <Link
                    href="/downloads"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Downloads
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Legal
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 mt-10 pt-6 text-center">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()}{" "}
              <a
                href="https://symflo.dev"
                className="hover:text-foreground transition-colors"
              >
                SymfloFi
              </a>
              . All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
