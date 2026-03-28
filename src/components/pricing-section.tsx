"use client";

import { useState } from "react";
import Link from "next/link";

export type PlanData = {
  name: string;
  price: string;
  period: string;
  bulkPrice: string;
  bulkSavings: string;
  bulkQty: number;
  features: string[];
  cta: string;
  highlight: boolean;
};

function PricingToggle({
  isBulk,
  onChange,
}: {
  isBulk: boolean;
  onChange: (bulk: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit mx-auto mb-10">
      <button
        onClick={() => onChange(false)}
        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
          !isBulk
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Single
      </button>
      <button
        onClick={() => onChange(true)}
        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
          isBulk
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Bulk (50+)
      </button>
    </div>
  );
}

function PlanCard({
  plan,
  isBulk,
  accentColor = "primary",
}: {
  plan: PlanData;
  isBulk: boolean;
  accentColor?: string;
}) {
  const highlightBorder =
    accentColor === "emerald"
      ? "bg-emerald-500/5 border-emerald-500/30 shadow-xl shadow-emerald-500/10 sm:scale-[1.02]"
      : "bg-primary/5 border-primary/30 shadow-xl shadow-primary/10 sm:scale-[1.02]";
  const normalBorder =
    accentColor === "emerald"
      ? "bg-card/60 backdrop-blur-sm border-border hover:border-emerald-500/20"
      : "bg-card/60 backdrop-blur-sm border-border hover:border-primary/20";
  const highlightBadgeBg =
    accentColor === "emerald" ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground";
  const highlightBtn =
    accentColor === "emerald"
      ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/25"
      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25";
  const checkColor = accentColor === "emerald" ? "text-emerald-400" : "text-emerald-400";

  return (
    <div
      className={`relative flex flex-col p-6 sm:p-7 rounded-2xl border transition-all ${
        plan.highlight ? highlightBorder : normalBorder
      }`}
    >
      {plan.highlight && (
        <div
          className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-semibold ${highlightBadgeBg}`}
        >
          Most Popular
        </div>
      )}
      <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
      <div className="mt-5 mb-1">
        {isBulk && plan.bulkPrice !== plan.price ? (
          <>
            <span className="text-3xl font-bold text-foreground">
              {plan.bulkPrice}
            </span>
            <span className="text-sm text-muted-foreground">/each</span>
          </>
        ) : (
          <>
            <span className="text-3xl font-bold text-foreground">
              {plan.price}
            </span>
            {plan.period && (
              <span className="text-sm text-muted-foreground">
                {plan.period}
              </span>
            )}
          </>
        )}
      </div>
      <div className="mb-6 h-5">
        {isBulk && plan.bulkSavings ? (
          <span className="text-sm text-amber-400 font-medium">
            Save {plan.bulkSavings} per license
          </span>
        ) : null}
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((f) => (
          <li
            key={f}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <svg
              className={`w-4 h-4 ${checkColor} shrink-0`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {f}
          </li>
        ))}
        {isBulk && plan.bulkQty > 0 && (
          <li className="flex items-center gap-2 text-sm text-amber-400/80">
            <svg
              className="w-4 h-4 text-amber-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Minimum {plan.bulkQty} licenses
          </li>
        )}
      </ul>
      <Link
        href="/signup"
        className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
          plan.highlight
            ? highlightBtn
            : "border border-border text-foreground hover:bg-muted"
        }`}
      >
        {plan.cta}
      </Link>
    </div>
  );
}

export function SymfloFiPricing({ plans }: { plans: PlanData[] }) {
  const [isBulk, setIsBulk] = useState(false);
  const hasBulk = plans.some((p) => p.bulkPrice && p.bulkPrice !== p.price);

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">SymfloFi</h3>
            <p className="text-sm text-muted-foreground">
              Piso WiFi vending system
            </p>
          </div>
        </div>
      </div>
      {hasBulk && <PricingToggle isBulk={isBulk} onChange={setIsBulk} />}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <PlanCard key={plan.name} plan={plan} isBulk={isBulk} />
        ))}
      </div>
    </>
  );
}

export function SymfloWISPPricing({ plans: _plans }: { plans: PlanData[] }) {
  return (
    <>
      <div className="flex items-center justify-between mt-16 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-cyan-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">SymfloWISP</h3>
            <p className="text-sm text-muted-foreground">
              Your ISP. One box.
            </p>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-xl font-bold text-foreground mb-2">Coming Soon</h4>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            SymfloWISP turns a single mini PC into a complete WISP platform — PPPoE subscribers, RADIUS authentication, SNMP monitoring, VLAN segmentation, and more.
          </p>
          <p className="text-sm text-cyan-400 font-medium">
            Pricing will be announced soon. Interested? Contact us for early access.
          </p>
          <Link
            href="mailto:sales@symflofi.cloud"
            className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
          >
            Contact for Early Access
          </Link>
        </div>
      </div>
    </>
  );
}

export function PlayTabPricing({ plans }: { plans: PlanData[] }) {
  const [isBulk, setIsBulk] = useState(false);
  const hasBulk = plans.some((p) => p.bulkPrice && p.bulkPrice !== p.price);

  return (
    <>
      <div className="flex items-center justify-between mt-16 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
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
                d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">PlayTab</h3>
            <p className="text-sm text-muted-foreground">
              Coin-operated tablet gaming kiosk
            </p>
          </div>
        </div>
      </div>
      {hasBulk && <PricingToggle isBulk={isBulk} onChange={setIsBulk} />}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <PlanCard
            key={plan.name}
            plan={plan}
            isBulk={isBulk}
            accentColor="emerald"
          />
        ))}
      </div>
    </>
  );
}
