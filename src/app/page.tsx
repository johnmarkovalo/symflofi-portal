import Link from "next/link";
import PublicNav from "@/components/public-nav";
import { createClient } from "@/lib/supabase/server";

const features = [
  {
    title: "Cloud Management & Monitoring",
    description: "Issue licenses, track device status, app versions, and hardware info in real-time from anywhere.",
    icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
  },
  {
    title: "Operator Portal",
    description: "Operators get their own dashboard to view licenses, machines, and customize captive portal branding.",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    title: "Bandwidth & Session Control",
    description: "SQM-based traffic shaping, per-user bandwidth limits, and time-based session billing.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    title: "PPPoE Subscriber Plans",
    description: "Sell monthly internet plans with username/password authentication. Per-subscriber speed limits and automatic expiry.",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    title: "Coin & Voucher Payments",
    description: "Accept coins and vouchers. Flexible payment options for every walk-in customer.",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Remote Access & OTA",
    description: "Manage your machines remotely via secure VPN tunnel. Push firmware updates over-the-air with one click.",
    icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
  },
];

const hardware = [
  { name: "Orange Pi One", arch: "ARMv7 · Sunxi", recommended: true },
  { name: "Orange Pi Zero 3", arch: "ARM64 · Allwinner H618", recommended: false },
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
};

function formatTierPrice(cents: number) {
  if (cents === 0) return "Free";
  return `₱${(cents / 100).toLocaleString()}`;
}

function buildFeatureList(tier: LicenseTier): string[] {
  const features: string[] = [];
  const users = tier.max_concurrent_users;
  features.push(users === null || users === -1 ? "Unlimited concurrent users" : `${users} concurrent users`);
  if (tier.pppoe_enabled) features.push("PPPoE subscriber plans");
  if (tier.cloud_dashboard) features.push("Cloud dashboard & monitoring");
  if (tier.max_sub_vendos !== 0) features.push(tier.max_sub_vendos === -1 ? "Sub-vendor accounts" : `${tier.max_sub_vendos} sub-vendors`);
  const hist = tier.sales_history_days;
  features.push(hist === -1 ? "Unlimited sales history" : `${hist} day${hist !== 1 ? "s" : ""} sales history`);
  if (tier.support_level === "priority") features.push("Priority support");
  return features;
}

const stats = [
  { value: "500+", label: "Active Machines" },
  { value: "50+", label: "Operators" },
  { value: "99.9%", label: "Uptime" },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: tiers } = await supabase
    .from("license_tiers")
    .select("*")
    .eq("is_public", true)
    .order("sort_order", { ascending: true });

  const plans = (tiers ?? []).map((tier: LicenseTier) => ({
    name: tier.label,
    price: formatTierPrice(tier.price_cents),
    period: tier.price_cents > 0 && tier.duration_days === 365 ? "/year" : tier.price_cents > 0 ? `/${tier.duration_days}d` : "",
    features: buildFeatureList(tier),
    cta: tier.price_cents === 0 ? "Get Started" : `Get ${tier.label} License`,
    highlight: tier.is_highlighted,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-30%] right-[-15%] w-[800px] h-[800px] rounded-full blur-3xl animate-pulse-glow"
          style={{ background: "linear-gradient(to bottom left, oklch(0.5 0.22 270), oklch(0.3 0.15 300))" }}
        />
        <div
          className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-3xl animate-pulse-glow"
          style={{ background: "linear-gradient(to top right, oklch(0.45 0.18 250), oklch(0.3 0.12 220))", animationDelay: "2s" }}
        />
      </div>

      <PublicNav />

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-24 sm:pb-20 md:pt-32 md:pb-28">
        <div className="text-center max-w-3xl mx-auto">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Cloud-Managed WiFi Vending System
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] animate-fade-in-up delay-100">
            The Modern{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Piso WiFi
            </span>{" "}
            Platform
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in-up delay-200">
            Cloud-connected WiFi vending with built-in remote monitoring,
            bandwidth control, subscriber plans, and license management.
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
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Advanced Features</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm sm:text-base">
            Everything you need to run a WiFi vending business, from coin slots to cloud dashboards.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-5 sm:p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hardware */}
      <section id="hardware" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Supported Hardware</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm sm:text-base">
            Pre-built firmware images ready to flash. Just download, write to SD card, and boot.
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
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
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
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">License Plans</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm sm:text-base">
            Start free, upgrade when you are ready. All plans include OTA firmware updates.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col p-6 sm:p-7 rounded-2xl border transition-all ${
                plan.highlight
                  ? "bg-primary/5 border-primary/30 shadow-xl shadow-primary/10 sm:scale-[1.02]"
                  : "bg-card/60 backdrop-blur-sm border-border hover:border-primary/20"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              <div className="mt-5 mb-6">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
                    : "border border-border text-foreground hover:bg-muted"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="relative rounded-3xl border border-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10" />
          <div className="relative px-6 py-12 sm:px-8 sm:py-16 md:px-16 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Ready to get started?</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm sm:text-base">
              Sign up as an operator, flash the firmware, and start earning in minutes.
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
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                  </svg>
                </div>
                <span className="text-sm font-bold">SymfloFi</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cloud-managed WiFi vending platform.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#hardware" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Hardware</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Get Started</Link></li>
                <li><Link href="/signin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Operator Portal</Link></li>
                <li><Link href="/downloads" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Downloads</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 mt-10 pt-6 text-center">
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} <a href="https://symflo.dev" className="hover:text-foreground transition-colors">SymfloFi</a>. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
