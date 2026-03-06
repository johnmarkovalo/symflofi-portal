import Link from "next/link";

const features = [
  {
    title: "Cloud License Management",
    description: "Issue, revoke, and monitor license keys remotely. Tiered plans from trial to enterprise.",
    icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
  },
  {
    title: "Real-Time Machine Monitoring",
    description: "Track all your devices online status, app version, hardware info, and last seen timestamps live.",
    icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
  },
  {
    title: "Operator Portal",
    description: "Operators get their own dashboard to view licenses and machines scoped to their account.",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    title: "Bandwidth & Session Control",
    description: "SQM-based traffic shaping, per-user bandwidth limits, and session time or data-based billing.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    title: "Coin & E-Payment Integration",
    description: "Accept coins, GCash, Maya, and vouchers. Flexible payment options for every customer.",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Captive Portal Theming",
    description: "Fully customizable captive portal with your own branding, colors, and splash page design.",
    icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
  },
];

const hardware = [
  { name: "Orange Pi One", arch: "ARMv7 · Sunxi", recommended: true },
  { name: "Orange Pi Zero 3", arch: "ARM64 · Allwinner H618", recommended: false },
  { name: "Raspberry Pi 3/4", arch: "ARM64 · Broadcom", recommended: false },
];

const plans = [
  {
    name: "Demo",
    price: "Free",
    period: "",
    description: "Try SymfloFi with no commitment",
    features: ["3 concurrent users", "5 vouchers per month", "Coin slot support", "1 day sales history", "Manual updates"],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Lite",
    price: "₱300",
    period: "/year",
    description: "Great for small setups just getting started",
    features: ["30 concurrent users", "Coin slot support", "Voucher system", "30 days sales history", "Automatic OTA updates"],
    cta: "Get Lite License",
    highlight: false,
  },
  {
    name: "Pro",
    price: "₱500",
    period: "/year",
    description: "For operators running a growing WiFi business",
    features: ["100 concurrent users", "GCash & Maya payments", "Cloud dashboard & monitoring", "Session roaming", "Unlimited sales history", "Automatic OTA updates"],
    cta: "Get Pro License",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "₱1,500",
    period: "/year",
    description: "Unlimited scale for serious operators and distributors",
    features: ["Unlimited concurrent users", "All payment methods", "Cloud dashboard & monitoring", "Session roaming", "Sub-vendor accounts", "Unlimited sales history", "Priority support"],
    cta: "Get Enterprise",
    highlight: false,
  },
];

const stats = [
  { value: "500+", label: "Active Machines" },
  { value: "50+", label: "Operators" },
  { value: "99.9%", label: "Uptime" },
];

export default function LandingPage() {
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

      {/* Navigation */}
      <nav className="relative z-20 border-b border-border/50 backdrop-blur-xl bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
              </svg>
            </div>
            <span className="text-sm font-bold">SymfloFi</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#hardware" className="hover:text-foreground transition-colors">Hardware</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link href="/downloads" className="hover:text-foreground transition-colors">Downloads</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/signin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="text-center max-w-3xl mx-auto">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Open Source WiFi Vending System
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] animate-fade-in-up delay-100">
            The Modern{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Piso WiFi
            </span>{" "}
            Platform
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in-up delay-200">
            Cloud-connected WiFi vending with built-in remote monitoring, e-payments,
            bandwidth control, and license management. Built on ImmortalWrt.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
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
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto animate-fade-in-up delay-400">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">Advanced Features</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Everything you need to run a WiFi vending business, from coin slots to cloud dashboards.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5"
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
      <section id="hardware" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">Supported Hardware</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Pre-built firmware images ready to flash. Just download, write to SD card, and boot.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {hardware.map((hw) => (
            <div
              key={hw.name}
              className={`relative p-6 rounded-2xl border transition-all ${
                hw.recommended
                  ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/10"
                  : "bg-card/60 backdrop-blur-sm border-border hover:border-primary/20"
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
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">License Plans</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Start free, upgrade when you are ready. All plans include OTA firmware updates.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col p-7 rounded-2xl border transition-all ${
                plan.highlight
                  ? "bg-primary/5 border-primary/30 shadow-xl shadow-primary/10 scale-[1.02]"
                  : "bg-card/60 backdrop-blur-sm border-border hover:border-primary/20"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
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
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="relative rounded-3xl border border-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10" />
          <div className="relative px-8 py-16 md:px-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to get started?</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Sign up as an operator, flash the firmware, and start earning in minutes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
              >
                Create Free Account
              </Link>
              <Link
                href="/signin"
                className="px-8 py-3.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 mt-10">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
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
                Open source WiFi vending system built on ImmortalWrt. Cloud-managed, coin-operated.
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
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Connect</h4>
              <ul className="space-y-2">
                <li><a href="https://github.com/johnmarkovalo/symflofi" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 mt-10 pt-6 text-center">
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} SymfloFi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
