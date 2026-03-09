import Link from "next/link";
import PublicNav from "@/components/public-nav";
import { createClient } from "@/lib/supabase/server";

type DistributorTier = {
  id: string;
  name: string;
  label: string;
  discount_pct: number;
  min_licenses: number;
  bonus_licenses: number;
  sort_order: number;
};

const tierAccent: Record<string, { border: string; glow: string; icon: string; bg: string }> = {
  bronze: { border: "border-amber-700/30", glow: "shadow-amber-700/10", icon: "text-amber-600", bg: "bg-amber-700/5" },
  silver: { border: "border-slate-400/30", glow: "shadow-slate-400/10", icon: "text-slate-300", bg: "bg-slate-400/5" },
  gold: { border: "border-yellow-500/30", glow: "shadow-yellow-500/15", icon: "text-yellow-400", bg: "bg-yellow-500/5" },
};

const steps = [
  {
    step: "1",
    title: "Sign Up & Get Licensed",
    description: "Create an operator account and purchase your first SymfloFi license to start your piso WiFi business.",
    icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
  },
  {
    step: "2",
    title: "Buy Licenses & Grow",
    description: "Purchase licenses for your machines. Once you hit the threshold, you&apos;re automatically promoted to distributor.",
    icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941",
  },
  {
    step: "3",
    title: "Unlock Higher Tiers",
    description: "Keep selling and climb the tiers automatically. Each tier unlocks bigger discounts and bonus license rewards.",
    icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.896m5.25-6.388V2.721",
  },
];

export default async function DistributorProgramPage() {
  const supabase = await createClient();

  const { data: tiers } = await supabase
    .from("distributor_tiers")
    .select("*")
    .order("sort_order", { ascending: true });

  const tierList = (tiers ?? []) as DistributorTier[];

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

      <PublicNav activePage="distributors" />

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-6">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Distributor Program
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            Grow Your Business with{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              SymfloFi
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Every operator can become a distributor — no application needed. Just buy licenses, hit the threshold, and you&apos;re automatically promoted with wholesale discounts and bonus rewards.
          </p>
        </div>
      </section>

      {/* Tier Cards */}
      {tierList.length > 0 && (
        <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold">Distributor Tiers</h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base max-w-xl mx-auto">
              Start at any tier and automatically advance as you sell more licenses. Higher tiers unlock bigger discounts and bonus rewards.
            </p>
          </div>

          {/* Tier progression */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {tierList.map((tier, i) => {
              const accent = tierAccent[tier.name] ?? { border: "border-primary/30", glow: "shadow-primary/10", icon: "text-primary", bg: "bg-primary/5" };
              const isTop = i === tierList.length - 1;
              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col p-6 sm:p-7 rounded-2xl border transition-all ${accent.border} ${accent.bg} shadow-lg ${accent.glow} ${isTop ? "sm:scale-[1.02]" : ""}`}
                >
                  {isTop && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-yellow-500 text-yellow-950 text-[11px] font-semibold">
                      Top Tier
                    </div>
                  )}

                  {/* Tier header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl ${accent.bg} border ${accent.border} flex items-center justify-center`}>
                      <svg className={`w-5 h-5 ${accent.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.896m5.25-6.388V2.721" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{tier.label}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{tier.name} tier</p>
                    </div>
                  </div>

                  {/* Discount highlight */}
                  <div className="mb-5">
                    <span className="text-3xl font-bold text-foreground">{tier.discount_pct}%</span>
                    <span className="text-sm text-muted-foreground ml-1">wholesale discount</span>
                  </div>

                  {/* Benefits */}
                  <ul className="space-y-3 flex-1 mb-6">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {tier.discount_pct}% off all license purchases
                    </li>
                    {tier.bonus_licenses > 0 && (
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {tier.bonus_licenses} bonus license{tier.bonus_licenses !== 1 ? "s" : ""} on promotion
                      </li>
                    )}
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Listed in public directory
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Resell licenses in your area
                    </li>
                  </ul>

                  {/* Auto-promotion threshold */}
                  {tier.min_licenses > 0 ? (
                    <div className="rounded-xl bg-background/50 border border-border px-4 py-3">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Auto-promotion:</span>{" "}
                        Sell {tier.min_licenses}+ licenses to unlock
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-background/50 border border-border px-4 py-3">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Starting tier</span> — assigned on approval
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Promotion flow arrow */}
          {tierList.length > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8 text-sm text-muted-foreground">
              {tierList.map((tier, i) => (
                <span key={tier.id} className="flex items-center gap-3">
                  <span className="font-medium text-foreground">{tier.label}</span>
                  {i < tierList.length - 1 && (
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  )}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* How it works */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold">How It Works</h2>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base max-w-xl mx-auto">
            No applications or approvals — just buy, grow, and get promoted automatically.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {steps.map((s) => (
            <div key={s.step} className="relative p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                  </svg>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Step {s.step}</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="relative rounded-3xl border border-border overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10" />
          <div className="relative px-6 py-12 sm:px-8 sm:py-16 md:px-16 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold">Start your journey today</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm sm:text-base">
              Sign up, buy licenses, and get automatically promoted to distributor as your business grows. No applications, no waiting.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
              >
                Get Started Free
              </Link>
              <a
                href="https://www.facebook.com/symflofi"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-all"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()}{" "}
              <a href="https://symflo.dev" className="hover:text-foreground transition-colors">SymfloFi</a>. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
