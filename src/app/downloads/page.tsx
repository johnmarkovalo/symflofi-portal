"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const UPDATES_BASE = "https://api.symflofi.cloud/updates";
const MANIFEST_URL = `${UPDATES_BASE}/manifest.json`;
const STORAGE_BASE = UPDATES_BASE;

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

const highlights = [
  "Captive portal that works on all devices out of the box",
  "Coin slot support with plug-and-play wiring",
  "Built-in bandwidth management per user",
  "Voucher system for prepaid WiFi access",
  "Admin panel for managing rates, sessions, and sales",
  "Connects to SymfloFi Cloud for remote monitoring",
];

const requirements = [
  "Supported board (Orange Pi One, Zero 3, or Raspberry Pi)",
  "MicroSD card (8GB or larger)",
  "USB-to-LAN adapter + Ethernet cables (x2)",
  "TP-Link access point (configured as dumb AP)",
  "Power supply and coin slot module",
];

const steps = [
  { step: 1, title: "Download", description: "Grab the firmware image below and flash it to a microSD card using balenaEtcher." },
  { step: 2, title: "Assemble", description: "Connect your board to the router, WiFi access point, and coin slot. Refer to the wiring guide." },
  { step: 3, title: "Power on", description: "Insert the SD card, plug in the power, and wait about a minute for the system to boot up." },
  { step: 4, title: "Activate", description: "Open the admin panel, enter your license key, set your rates, and you're ready to earn." },
];

export default function DownloadsPage() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch(MANIFEST_URL, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setManifest(data))
      .catch(() => setManifest(null));
  }, []);

  // Sort versions newest first
  const versions = manifest
    ? Object.keys(manifest.releases).sort((a, b) => {
        const pa = a.split(".").map(Number);
        const pb = b.split(".").map(Number);
        for (let i = 0; i < 3; i++) {
          if ((pa[i] || 0) !== (pb[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
        }
        return 0;
      })
    : [];

  const latestVersion = manifest?.latest || versions[0] || null;
  const latestRelease = latestVersion ? manifest?.releases[latestVersion] : null;

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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
            <Link href="/signin" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              Sign up
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
            <div className="px-4 py-3 space-y-1">
              <Link href="/#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Features</Link>
              <Link href="/#hardware" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Hardware</Link>
              <Link href="/#pricing" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Pricing</Link>
              <Link href="/downloads" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm text-foreground font-medium hover:bg-muted transition-colors">Downloads</Link>
              <Link href="/signin" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors sm:hidden">Log in</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Header */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-10 sm:pb-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 mb-6">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Firmware Downloads
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight">
            Get the Firmware
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to turn your board into a fully working Piso WiFi machine. Flash it, wire it, earn.
          </p>
        </div>
      </section>

      {/* Latest Release */}
      {latestRelease && latestVersion ? (
        <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-10 sm:pb-12">
          <div className="relative rounded-2xl border border-primary/30 bg-primary/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/5" />
            <div className="relative p-5 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">Latest Release</h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
                      v{latestVersion}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Released {latestRelease.date}
                  </p>
                </div>
              </div>

              {latestRelease.changelog && (
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{latestRelease.changelog}</p>
              )}

              {/* Board cards */}
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
                            <a
                              href={`${STORAGE_BASE}/${bundle.image.url}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/25"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Full Image ({formatSize(bundle.image.size)})
                            </a>
                          )}
                          {bundle.update && (
                            <a
                              href={`${STORAGE_BASE}/${bundle.update.url}`}
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
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Checksums */}
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

      {/* Previous Releases */}
      {versions.length > 1 && (
        <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-10 sm:pb-12">
          <h2 className="text-lg font-bold text-foreground mb-4">Previous Releases</h2>
          <div className="space-y-3">
            {versions.slice(1).map((version) => {
              const release = manifest!.releases[version];
              return (
                <div key={version} className="rounded-xl border border-border/50 bg-card/40 p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">v{version}</span>
                      <span className="text-xs text-muted-foreground">{release.date}</span>
                    </div>
                  </div>
                  {release.changelog && (
                    <p className="text-xs text-muted-foreground mb-3">{release.changelog}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(release.bundles).map(([boardId, bundle]) => {
                      const meta = BOARD_META[boardId];
                      const label = meta?.name || boardId;
                      return (
                        <div key={boardId} className="flex items-center gap-1.5">
                          {bundle.image && (
                            <a
                              href={`${STORAGE_BASE}/${bundle.image.url}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              {label} Image
                            </a>
                          )}
                          {bundle.update && (
                            <a
                              href={`${STORAGE_BASE}/${bundle.update.url}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              {label} OTA
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* What's Inside + What You Need */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-10 sm:pb-12">
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="rounded-2xl bg-card/60 backdrop-blur-sm border border-border p-5 sm:p-6">
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

          <div className="rounded-2xl bg-card/60 backdrop-blur-sm border border-border p-5 sm:p-6">
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
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 sm:mb-8 text-center">Getting Started</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {steps.map((s) => (
            <div key={s.step} className="rounded-2xl bg-card/60 backdrop-blur-sm border border-border p-4 sm:p-6">
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SymfloFi. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
