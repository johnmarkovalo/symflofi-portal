import PublicNav from "@/components/public-nav";
import DownloadLink from "../download-link";
import { createClient } from "@/lib/supabase/server";

const UPDATES_BASE = "https://api.symflofi.cloud/updates";
const PLAYTAB_MANIFEST_URL = `${UPDATES_BASE}/playtab/manifest.json`;

interface PlayTabFileInfo {
  url: string;
  sha256: string;
  size: number;
}

interface PlayTabRelease {
  date: string;
  changelog: string;
  apk: PlayTabFileInfo;
  firmware?: PlayTabFileInfo;
}

interface PlayTabManifest {
  latest: string;
  releases: Record<string, PlayTabRelease>;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

async function getManifest(): Promise<PlayTabManifest | null> {
  try {
    const res = await fetch(PLAYTAB_MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const tierMeta = [
  {
    id: "lite",
    tierName: "playtab_lite",
    name: "PlayTab Lite",
    prefix: "PTLI-",
    color: "emerald",
    description: "Simplest setup — uses an external timer (AllAnTimer) to control power to the tablet. No ESP32 needed.",
    hardware: [
      "Android tablet (any, with USB-C or Micro USB)",
      "AllAnTimer or similar coin-operated power timer",
      "USB charging cable",
    ],
    setup: [
      { step: 1, title: "Install the APK", description: "Download the PlayTab APK below and install it on the tablet. You can transfer via USB or download directly on the tablet." },
      { step: 2, title: "Connect to WiFi", description: "On the license entry screen, select your WiFi network and connect. Internet is required for license activation." },
      { step: 3, title: "Enter license key", description: "Enter your PTLI-XXXX-XXXX-XXXX license key. The app will validate it and set up Lite mode automatically." },
      { step: 4, title: "Complete setup wizard", description: "Set your admin PIN and choose which apps customers can use. Skip the hardware step (no ESP32 for Lite)." },
      { step: 5, title: "Wire the timer", description: "Connect the AllAnTimer's USB output to the tablet's charging port. When a customer inserts coins, the timer supplies power and the tablet unlocks. When time runs out, power is cut and the tablet locks." },
      { step: 6, title: "Set as kiosk (optional)", description: "For full lockdown, connect via ADB and run: adb shell dpm set-device-owner com.symflo.playtab/.PlayTabDeviceAdminReceiver" },
    ],
    notes: "Lite mode tracks sessions by charging state (power on = session start, power off = session end). Earnings are managed by the AllAnTimer — PlayTab only handles the lock screen and app whitelisting.",
  },
  {
    id: "pro",
    tierName: "playtab_pro",
    name: "PlayTab Pro",
    prefix: "PTPR-",
    color: "primary",
    description: "Full coin-operated setup with ESP32 handling the coin acceptor and countdown timer. The tablet connects to the ESP32 over WiFi.",
    hardware: [
      "Android tablet (any, with USB-C or Micro USB)",
      "ESP32 development board (ESP32-WROOM-32 or similar)",
      "Coin acceptor (pulse mode, e.g. ALLAN 1239)",
      "5V power supply for ESP32",
      "WiFi router (ESP32 and tablet must be on the same network)",
      "Jumper wires for coin acceptor to ESP32",
    ],
    setup: [
      { step: 1, title: "Flash the ESP32 firmware", description: "Download the firmware binary below. Flash it using PlatformIO, Arduino IDE, or esptool: esptool.py write_flash 0x10000 firmware-esp32-1.0.0.bin" },
      { step: 2, title: "Wire the coin acceptor", description: "Connect the coin acceptor's COIN/PULSE pin to GPIO 15 on the ESP32. Connect GND to GND. The acceptor should be in pulse mode (one pulse per coin)." },
      { step: 3, title: "Power on the ESP32", description: "The ESP32 starts in AP mode (PLAYTAB-SETUP-XXXX). Connect your phone to this AP to configure WiFi. Once configured, the ESP32 joins your local network." },
      { step: 4, title: "Install the APK on the tablet", description: "Download and install the PlayTab APK. Connect to WiFi and enter your PTPR-XXXX-XXXX-XXXX license key." },
      { step: 5, title: "Complete setup wizard", description: "Set admin PIN, configure coin rate (e.g. P1 = 3 minutes), choose allowed apps, and connect to the ESP32 (enter its IP or use auto-discovery)." },
      { step: 6, title: "Test", description: "Insert a coin. The ESP32 should detect it (LED blinks), start the timer, and the tablet should unlock automatically. When the timer expires, the tablet locks back to the 'Insert Coin' screen." },
      { step: 7, title: "Set as kiosk", description: "For full lockdown: adb shell dpm set-device-owner com.symflo.playtab/.PlayTabDeviceAdminReceiver" },
    ],
    notes: "The ESP32 is the source of truth for the timer. The tablet polls the ESP32 every second. If the ESP32 goes offline, the tablet locks after 5 consecutive failed polls (fail-closed security).",
  },
  {
    id: "business",
    tierName: "playtab_business",
    name: "PlayTab Business",
    prefix: "PTBS-",
    color: "amber",
    description: "Enterprise setup with SymfloFi board integration. The tablet connects to a SymfloFi vendo machine via WebSocket for real-time control and cloud session sync.",
    hardware: [
      "Android tablet (any, with USB-C or Micro USB)",
      "SymfloFi vendo machine (Orange Pi + coin acceptor)",
      "WiFi router (tablet and board on the same network)",
    ],
    setup: [
      { step: 1, title: "Set up your SymfloFi machine", description: "Flash and configure your SymfloFi board first using the SymfloFi firmware. Make sure it's online and the coin acceptor works." },
      { step: 2, title: "Install the PlayTab APK", description: "Download and install on the tablet. Connect to the same WiFi network as the SymfloFi board." },
      { step: 3, title: "Enter license key", description: "Enter your PTBS-XXXX-XXXX-XXXX license key. The app will validate it and set up Business mode." },
      { step: 4, title: "Complete setup wizard", description: "Set admin PIN, choose allowed apps, and enter the SymfloFi board's IP address and device token." },
      { step: 5, title: "Pair with board", description: "The tablet connects via WebSocket. The SymfloFi board sends lock/unlock commands when coins are inserted and the timer expires." },
      { step: 6, title: "Set as kiosk", description: "For full lockdown: adb shell dpm set-device-owner com.symflo.playtab/.PlayTabDeviceAdminReceiver" },
    ],
    notes: "Business mode enables full cloud sync — sessions, earnings, and remote management through the SymfloFi Cloud portal. The SymfloFi board controls the coin acceptor and timer; PlayTab handles the tablet lock screen and app whitelisting.",
  },
];

function formatPrice(priceCents: number): string {
  return `P${(priceCents / 100).toLocaleString()}/year`;
}

const commonRequirements = [
  "A computer with ADB installed (for kiosk mode setup)",
  "A SymfloFi Cloud account with a PlayTab license key",
  "The tablet should be factory reset before first install for cleanest setup",
];

export const dynamic = "force-dynamic";

export default async function PlayTabDownloadsPage() {
  const [manifest, supabase] = await Promise.all([getManifest(), createClient()]);
  const latest = manifest?.latest || null;
  const release = latest ? manifest?.releases[latest] : null;

  const { data: tierPrices } = await supabase
    .from("license_tiers")
    .select("name, price_cents")
    .eq("product", "playtab")
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
          style={{ background: "linear-gradient(to bottom left, oklch(0.4 0.18 160), oklch(0.3 0.12 180))" }}
        />
        <div
          className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-3xl animate-pulse-glow"
          style={{ background: "linear-gradient(to top right, oklch(0.45 0.18 270), oklch(0.3 0.12 300))", animationDelay: "2s" }}
        />
      </div>

      <PublicNav activePage="downloads" />

      {/* Header */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-10 sm:pb-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 mb-6">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
            </svg>
            PlayTab Setup Guide
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight">
            PlayTab
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Turn any Android tablet into a coin-operated gaming kiosk. Download, install, activate, earn.
          </p>
        </div>
      </section>

      {/* Downloads */}
      {release && latest ? (
        <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-10 sm:pb-12">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/5 pointer-events-none" />
            <div className="relative p-5 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">Download v{latest}</h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
                      Latest
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Released {release.date}</p>
                </div>
              </div>

              {release.changelog && (
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{release.changelog}</p>
              )}

              <div className="flex flex-wrap gap-3">
                <DownloadLink
                  href={`${UPDATES_BASE}/${release.apk.url}`}
                  version={latest}
                  board="android"
                  fileType="apk"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/25"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Android APK ({formatSize(release.apk.size)})
                </DownloadLink>

                {release.firmware && (
                  <DownloadLink
                    href={`${UPDATES_BASE}/${release.firmware.url}`}
                    version={latest}
                    board="esp32"
                    fileType="firmware"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-border text-foreground font-semibold text-sm hover:bg-muted transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    ESP32 Firmware ({formatSize(release.firmware.size)})
                  </DownloadLink>
                )}
              </div>

              <div className="mt-4 space-y-1 overflow-x-auto">
                <p className="text-[10px] text-muted-foreground/60 font-mono whitespace-nowrap">
                  APK SHA256: <span className="select-all">{release.apk.sha256}</span>
                </p>
                {release.firmware && (
                  <p className="text-[10px] text-muted-foreground/60 font-mono whitespace-nowrap">
                    Firmware SHA256: <span className="select-all">{release.firmware.sha256}</span>
                  </p>
                )}
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
                        <span className="text-muted-foreground/40 mt-1">•</span>
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
