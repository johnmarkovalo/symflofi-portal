import PublicNav from "@/components/public-nav";
import DownloadLink from "../download-link";
import { createClient } from "@/lib/supabase/server";

const UPDATES_BASE = "https://api.symflofi.cloud/updates";
const MANIFEST_URL = `${UPDATES_BASE}/manifest.json`;

interface FileInfo {
  url: string;
  sha256: string;
  size: number;
}

interface BoardBundle {
  update?: FileInfo;
  image?: FileInfo;
}

interface ReleaseInfo {
  date: string;
  changelog: string;
  bundles: Record<string, BoardBundle>;
}

interface Manifest {
  latest: string;
  releases: Record<string, ReleaseInfo>;
}

const BOARD_META: Record<string, { name: string; arch: string; soc: string; recommended?: boolean }> = {
  orangepione: { name: "Orange Pi One", arch: "ARMv7", soc: "Allwinner H3", recommended: true },
  orangepizero3: { name: "Orange Pi Zero 3", arch: "ARM64", soc: "Allwinner H618" },
  rpi: { name: "Raspberry Pi 3/4", arch: "ARM64", soc: "Broadcom" },
};

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatPrice(priceCents: number): string {
  return `P${(priceCents / 100).toLocaleString()}/year`;
}

async function getManifest(): Promise<Manifest | null> {
  try {
    const res = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const tierMeta = [
  {
    id: "lite",
    tierName: "lite",
    name: "SymfloFi Lite",
    prefix: "SFLI-",
    color: "emerald",
    description: "Basic Piso WiFi setup with captive portal, coin slot support, and cloud dashboard. Great for single-location operators.",
    hardware: [
      "Orange Pi One (recommended) or supported SBC",
      "MicroSD card (8GB or larger)",
      "USB-to-LAN adapter",
      "2x Ethernet cables",
      "TP-Link access point (configured as dumb AP)",
      "5V/2A power supply",
      "Coin slot module (pulse mode)",
    ],
    setup: [
      { step: 1, title: "Flash the firmware", description: "Download the full image below and flash it to a microSD card using balenaEtcher or dd." },
      { step: 2, title: "Wire the hardware", description: "Connect the Orange Pi to your router via the USB-to-LAN adapter (WAN), and the TP-Link AP to the onboard Ethernet (LAN). Wire the coin slot module to the GPIO pins." },
      { step: 3, title: "Power on", description: "Insert the microSD card, plug in the power supply, and wait about 60 seconds for the system to boot. The WiFi AP will broadcast automatically." },
      { step: 4, title: "Access the admin panel", description: "Connect to the SymfloFi WiFi network and open 10.0.0.1 in your browser. The admin panel will guide you through initial setup." },
      { step: 5, title: "Enter license key", description: "Enter your SFLI-XXXX-XXXX-XXXX license key. The system will validate it and activate your machine." },
      { step: 6, title: "Configure rates", description: "Set your coin rates (e.g. P1 = 15 minutes), bandwidth limits, and session timeouts. Your machine is now ready to earn." },
    ],
    notes: "Lite supports up to 30 concurrent users, cloud dashboard access, and 30 days of sales history. OTA updates are delivered via the stable channel.",
  },
  {
    id: "pro",
    tierName: "pro",
    name: "SymfloFi Pro",
    prefix: "SFPR-",
    color: "primary",
    description: "Full-featured setup with e-payment, PPPoE, remote access, sub-vendo support, and unlimited sales history.",
    hardware: [
      "Orange Pi One (recommended) or supported SBC",
      "MicroSD card (8GB or larger)",
      "USB-to-LAN adapter",
      "2x Ethernet cables",
      "TP-Link access point (configured as dumb AP)",
      "5V/2A power supply",
      "Coin slot module (pulse mode)",
    ],
    setup: [
      { step: 1, title: "Flash the firmware", description: "Download the full image below and flash it to a microSD card using balenaEtcher or dd." },
      { step: 2, title: "Wire the hardware", description: "Connect the Orange Pi to your router via the USB-to-LAN adapter (WAN), and the TP-Link AP to the onboard Ethernet (LAN). Wire the coin slot module to the GPIO pins." },
      { step: 3, title: "Power on", description: "Insert the microSD card, plug in the power supply, and wait about 60 seconds for the system to boot." },
      { step: 4, title: "Access the admin panel", description: "Connect to the SymfloFi WiFi network and open 10.0.0.1 in your browser." },
      { step: 5, title: "Enter license key", description: "Enter your SFPR-XXXX-XXXX-XXXX license key. The system will validate it and unlock Pro features." },
      { step: 6, title: "Configure rates & features", description: "Set coin rates, bandwidth limits, and enable Pro features: e-payment (GCash/Maya), PPPoE passthrough, voucher system, and sub-vendo management." },
      { step: 7, title: "Enable remote access", description: "In the admin panel, enable Remote Access to manage your machine from the SymfloFi Cloud portal at symflofi.cloud." },
    ],
    notes: "Pro supports up to 100 concurrent users, up to 3 sub-vendos, e-payment integration, PPPoE passthrough, and unlimited sales history. Remote access lets you manage your machine from anywhere.",
  },
  {
    id: "enterprise",
    tierName: "enterprise",
    name: "SymfloFi Enterprise",
    prefix: "SFEN-",
    color: "amber",
    description: "Unlimited everything — designed for operators managing multiple machines, distributors, and large-scale deployments.",
    hardware: [
      "Orange Pi One (recommended) or supported SBC",
      "MicroSD card (8GB or larger)",
      "USB-to-LAN adapter",
      "2x Ethernet cables",
      "TP-Link access point (configured as dumb AP)",
      "5V/2A power supply",
      "Coin slot module (pulse mode)",
    ],
    setup: [
      { step: 1, title: "Flash the firmware", description: "Download the full image below and flash it to a microSD card using balenaEtcher or dd." },
      { step: 2, title: "Wire the hardware", description: "Same wiring as Pro — Orange Pi to router (WAN), AP to onboard Ethernet (LAN), coin slot to GPIO." },
      { step: 3, title: "Power on", description: "Insert the microSD card, plug in power, and wait for boot." },
      { step: 4, title: "Access the admin panel", description: "Connect to the SymfloFi WiFi network and open 10.0.0.1." },
      { step: 5, title: "Enter license key", description: "Enter your SFEN-XXXX-XXXX-XXXX license key. Enterprise features are unlocked immediately." },
      { step: 6, title: "Configure everything", description: "Set rates, enable all features (e-payment, PPPoE, vouchers), and configure unlimited sub-vendos." },
      { step: 7, title: "Enable remote access", description: "Enable Remote Access for full cloud management. Enterprise machines get priority support and access to all OTA channels." },
    ],
    notes: "Enterprise supports unlimited concurrent users, unlimited sub-vendos, all features enabled, priority support, and access to all OTA update channels including beta and nightly builds.",
  },
];

const commonRequirements = [
  "A computer for flashing the firmware (Windows, Mac, or Linux)",
  "balenaEtcher or similar SD card flashing tool",
  "A SymfloFi Cloud account with a license key",
  "Basic networking knowledge (Ethernet, WiFi AP configuration)",
  "A TP-Link access point set to dumb AP mode (bridge mode, DHCP off)",
];

export const dynamic = "force-dynamic";

export default async function SymfloFiSetupPage() {
  const [manifest, supabase] = await Promise.all([getManifest(), createClient()]);
  const latestVersion = manifest?.latest || null;
  const latestRelease = latestVersion ? manifest?.releases[latestVersion] : null;

  const { data: tierPrices } = await supabase
    .from("license_tiers")
    .select("name, price_cents")
    .eq("product", "symflofi")
    .in("name", tierMeta.map((t) => t.tierName));

  const priceMap: Record<string, number> = {};
  for (const tp of tierPrices ?? []) {
    priceMap[tp.name] = tp.price_cents;
  }

  const tiers = tierMeta.map((t) => ({
    ...t,
    price: priceMap[t.tierName] !== undefined ? formatPrice(priceMap[t.tierName]) : "",
  }));

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background */}
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

      <PublicNav activePage="downloads" />

      {/* Header */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-10 sm:pb-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-6">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
            </svg>
            SymfloFi Setup Guide
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight">
            SymfloFi
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Turn any supported board into a fully working Piso WiFi machine. Flash it, wire it, earn.
          </p>
        </div>
      </section>

      {/* Downloads */}
      {latestRelease && latestVersion ? (
        <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-10 sm:pb-12">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/5 pointer-events-none" />
            <div className="relative p-5 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">Download v{latestVersion}</h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
                      Latest
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Released {latestRelease.date}</p>
                </div>
              </div>

              {latestRelease.changelog && (
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{latestRelease.changelog}</p>
              )}

              <div className="space-y-4">
                {Object.entries(latestRelease.bundles).map(([boardId, bundle]) => {
                  const meta = BOARD_META[boardId] || { name: boardId, arch: "Unknown", soc: "" };
                  return (
                    <div key={boardId} className={`rounded-xl border p-4 sm:p-5 ${meta.recommended ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card/40"}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{meta.name}</h3>
                              {meta.recommended && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/20 text-primary">Recommended</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{meta.arch} &middot; {meta.soc}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {bundle.image && (
                            <DownloadLink
                              href={`${UPDATES_BASE}/${bundle.image.url}`}
                              version={latestVersion}
                              board={boardId}
                              fileType="image"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/25"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Full Image ({formatSize(bundle.image.size)})
                            </DownloadLink>
                          )}
                          {bundle.update && (
                            <DownloadLink
                              href={`${UPDATES_BASE}/${bundle.update.url}`}
                              version={latestVersion}
                              board={boardId}
                              fileType="update"
                              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-all ${
                                bundle.image
                                  ? "border border-border text-foreground hover:bg-muted"
                                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25"
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              OTA Update ({formatSize(bundle.update.size)})
                            </DownloadLink>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 overflow-x-auto">
                        {bundle.image && (
                          <p className="text-[10px] text-muted-foreground/60 font-mono whitespace-nowrap">
                            Image SHA256: <span className="select-all">{bundle.image.sha256}</span>
                          </p>
                        )}
                        {bundle.update && (
                          <p className="text-[10px] text-muted-foreground/60 font-mono whitespace-nowrap">
                            Update SHA256: <span className="select-all">{bundle.update.sha256}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-10 sm:pb-12">
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-8 text-center">
            <p className="text-muted-foreground">No releases available yet. Check back soon.</p>
          </div>
        </section>
      )}

      {/* Common Requirements */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-10 sm:pb-12">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Before You Start</h2>
        <div className="rounded-2xl bg-card/60 backdrop-blur-sm border border-border p-5 sm:p-6">
          <ul className="space-y-2.5">
            {commonRequirements.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm text-muted-foreground">
                <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Tier Setup Guides */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Setup Guide by Tier</h2>
        <div className="space-y-8">
          {tiers.map((tier) => (
            <div key={tier.id} className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
              {/* Tier header */}
              <div className="p-5 sm:p-6 border-b border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-mono text-muted-foreground">{tier.prefix}XXXX</span>
                  {tier.price && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">{tier.price}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{tier.description}</p>
              </div>

              <div className="p-5 sm:p-6 space-y-6">
                {/* Hardware requirements */}
                <div>
                  <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    </svg>
                    What You Need
                  </h4>
                  <ul className="space-y-1.5">
                    {tier.hardware.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-muted-foreground/40 mt-1">&bull;</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Step-by-step */}
                <div>
                  <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    Setup Steps
                  </h4>
                  <div className="space-y-3">
                    {tier.setup.map((s) => (
                      <div key={s.step} className="flex gap-3">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                          {s.step}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{s.title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{s.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">Note:</span> {tier.notes}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SymfloFi. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
