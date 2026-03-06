import Link from "next/link";

const firmware = {
  board: "Orange Pi One",
  arch: "ARMv7 · Allwinner H3",
  version: "1.0.0",
  base: "ImmortalWrt 24.10.5",
  date: "2026-03-01",
  size: "~180 MB",
  downloadUrl: "#",
  sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
};

const highlights = [
  "Captive portal that works on all devices out of the box",
  "Coin slot support with plug-and-play wiring",
  "Built-in bandwidth management per user",
  "Voucher system for prepaid WiFi access",
  "Admin panel for managing rates, sessions, and sales",
  "Connects to SymfloFi Cloud for remote monitoring",
];

const requirements = [
  "Orange Pi One board",
  "MicroSD card (8GB or larger)",
  "Power supply and coin slot module",
  "Ethernet cable and a WiFi access point",
];

const steps = [
  {
    step: 1,
    title: "Download",
    description: "Grab the firmware image below and flash it to a microSD card using balenaEtcher.",
  },
  {
    step: 2,
    title: "Assemble",
    description: "Connect your board to the router, WiFi access point, and coin slot. Refer to the wiring guide included in the package.",
  },
  {
    step: 3,
    title: "Power on",
    description: "Insert the SD card, plug in the power, and wait about a minute for the system to boot up.",
  },
  {
    step: 4,
    title: "Activate",
    description: "Open the admin panel, enter your license key, set your rates, and you're ready to earn.",
  },
];

export default function DownloadsPage() {
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
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
              </svg>
            </div>
            <span className="text-sm font-bold">SymfloFi</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <Link href="/#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="/#hardware" className="hover:text-foreground transition-colors">Hardware</Link>
            <Link href="/#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/downloads" className="text-foreground font-medium">Downloads</Link>
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

      {/* Header */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 mb-6">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Firmware Downloads
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Get the Firmware
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to turn your Orange Pi One into a fully working Piso WiFi machine. Flash it, wire it, earn.
          </p>
        </div>
      </section>

      {/* Download Card */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-12">
        <div className="relative rounded-2xl border border-primary/30 bg-primary/5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/5" />
          <div className="relative p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{firmware.board}</h2>
                <p className="text-sm text-muted-foreground">{firmware.arch}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">v{firmware.version}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Based on</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{firmware.base}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Released</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{firmware.date}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Size</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{firmware.size}</p>
              </div>
            </div>

            <a
              href={firmware.downloadUrl}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Image
            </a>

            <div className="mt-6 pt-6 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-1">SHA256 Checksum</p>
              <code className="text-xs font-mono text-muted-foreground select-all break-all">{firmware.sha256}</code>
            </div>
          </div>
        </div>
      </section>

      {/* What's Inside + What You Need */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-12">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-card/60 backdrop-blur-sm border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              What&apos;s Inside
            </h3>
            <ul className="space-y-2.5">
              {highlights.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-card/60 backdrop-blur-sm border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              </svg>
              What You&apos;ll Need
            </h3>
            <ul className="space-y-2.5">
              {requirements.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {r}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground/60 mt-4">
              A detailed wiring guide is included with the firmware package.
            </p>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Getting Started</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s) => (
            <div key={s.step} className="rounded-2xl bg-card/60 backdrop-blur-sm border border-border p-6">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary mb-3">
                {s.step}
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1.5">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SymfloFi. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
