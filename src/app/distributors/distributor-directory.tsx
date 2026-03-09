"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const DistributorMap = dynamic(() => import("./distributor-map"), { ssr: false });

type Distributor = {
  id: string;
  business_name: string | null;
  name: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  contact_number: string | null;
  facebook_url: string | null;
  distributor_tier: string | null;
  latitude: number | null;
  longitude: number | null;
};

const tierStyles: Record<string, string> = {
  bronze: "bg-amber-700/10 text-amber-600 border-amber-700/20",
  silver: "bg-slate-400/10 text-slate-300 border-slate-400/20",
  gold: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium border ${tierStyles[tier] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>
      {tier}
    </span>
  );
}

export default function DistributorDirectory({ distributors }: { distributors: Distributor[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Group by region
  const byRegion: Record<string, Distributor[]> = {};
  for (const d of distributors) {
    const region = d.region || "Other";
    if (!byRegion[region]) byRegion[region] = [];
    byRegion[region].push(d);
  }
  const regions = Object.keys(byRegion).sort();

  if (regions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted border border-border mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No distributors yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          We are building our distributor network. Interested in becoming a distributor?
        </p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-6 items-start">
      {/* Left: Scrollable details */}
      <div className="order-2 lg:order-1 max-h-[70vh] lg:max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 space-y-8 scrollbar-thin">
        {regions.map((region) => (
          <div key={region}>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {region}
            </h2>
            <div className="grid gap-4">
              {byRegion[region].map((d) => (
                <div
                  key={d.id}
                  onMouseEnter={() => setHoveredId(d.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setSelectedId(selectedId === d.id ? null : d.id)}
                  className={`bg-card/60 backdrop-blur-sm border rounded-2xl p-5 transition-all cursor-pointer ${
                    selectedId === d.id
                      ? "border-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.4)] bg-primary/10"
                      : hoveredId === d.id
                        ? "border-primary/50 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3)] bg-primary/5"
                        : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {d.business_name || d.name || "SymfloFi Distributor"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[d.city, d.province].filter(Boolean).join(", ") || region}
                      </p>
                    </div>
                    <TierBadge tier={d.distributor_tier} />
                  </div>

                  <div className="space-y-2">
                    {d.contact_number && (
                      <a
                        href={`tel:${d.contact_number}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                        {d.contact_number}
                      </a>
                    )}

                    {d.facebook_url && (
                      <a
                        href={d.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        Facebook Page
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Right: Map */}
      <div className="order-1 lg:order-2 lg:sticky lg:top-24">
        <DistributorMap distributors={distributors} highlightedId={hoveredId || selectedId} selectedId={selectedId} />
      </div>
    </div>
  );
}
