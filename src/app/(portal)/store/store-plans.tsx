"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

type Plan = {
  name: string;
  label: string;
  product: string;
  price: string;
  priceCents: number;
  originalPriceCents?: number;
  originalPrice?: string;
  period: string;
  durationDays: number;
  features: string[];
  highlight: boolean;
};

type DistributorPackage = {
  tierName: string;
  tierLabel: string;
  baseQuantity: number;
  bonusQuantity: number;
  totalQuantity: number;
  discountPct: number;
};

type LicenseTierPrice = {
  name: string;
  label: string;
  product: string;
  priceCents: number;
};

type CartItem = {
  plan: Plan;
  quantity: number;
  isBulkPackage?: boolean;
  distributorTierName?: string;
  distributorTierLabel?: string;
  bonusQuantity?: number;
  discountPct?: number;
  basePriceCents?: number;
};

const tierColors: Record<string, { badge: string; border: string; bg: string; text: string }> = {
  bronze: { badge: "bg-amber-700/20 text-amber-500 border-amber-700/30", border: "border-amber-700/30", bg: "bg-amber-700/5", text: "text-amber-500" },
  silver: { badge: "bg-slate-400/20 text-slate-300 border-slate-400/30", border: "border-slate-400/30", bg: "bg-slate-400/5", text: "text-slate-300" },
  gold: { badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", border: "border-yellow-500/30", bg: "bg-yellow-500/5", text: "text-yellow-400" },
};

export default function StorePlans({
  plans,
  bulkPackages,
  licenseTierPrices,
  isDistributor,
  currentDistributorTier,
  operatorDiscountPct,
}: {
  plans: Plan[];
  bulkPackages: DistributorPackage[];
  licenseTierPrices: LicenseTierPrice[];
  isDistributor: boolean;
  currentDistributorTier: string | null;
  operatorDiscountPct: number;
}) {
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLicenseTier, setSelectedLicenseTier] = useState<Record<string, string>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const cartItems = Object.values(cart).filter((i) => i.quantity > 0);
  const cartTotal = cartItems.reduce((sum, i) => {
    if (i.isBulkPackage && i.basePriceCents !== undefined && i.discountPct !== undefined) {
      const paidQty = i.quantity - (i.bonusQuantity ?? 0);
      return sum + Math.round(i.basePriceCents * (1 - i.discountPct / 100)) * paidQty;
    }
    return sum + i.plan.priceCents * i.quantity;
  }, 0);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  // Close drawer on escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    if (drawerOpen) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  function setQuantity(planName: string, plan: Plan, qty: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[planName];
      } else {
        next[planName] = { plan, quantity: Math.min(50, qty) };
      }
      return next;
    });
  }

  function getQuantity(planName: string) {
    return cart[planName]?.quantity ?? 0;
  }

  function addBulkPackage(pkg: DistributorPackage, licenseTier: LicenseTierPrice) {
    const cartKey = `bulk:${pkg.tierName}:${licenseTier.name}`;
    setCart((prev) => ({
      ...prev,
      [cartKey]: {
        plan: {
          name: licenseTier.name,
          label: licenseTier.label,
          product: licenseTier.name.startsWith("playtab_") ? "playtab" : licenseTier.product ?? "symflofi",
          price: `₱${(licenseTier.priceCents / 100).toLocaleString()}`,
          priceCents: licenseTier.priceCents,
          period: "/year",
          durationDays: 365,
          features: [],
          highlight: false,
        },
        quantity: pkg.totalQuantity,
        isBulkPackage: true,
        distributorTierName: pkg.tierName,
        distributorTierLabel: pkg.tierLabel,
        bonusQuantity: pkg.bonusQuantity,
        discountPct: operatorDiscountPct,
        basePriceCents: licenseTier.priceCents,
      },
    }));
  }

  function removeBulkItem(cartKey: string) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[cartKey];
      return next;
    });
  }

  function getBulkLineTotal(item: CartItem) {
    if (!item.isBulkPackage || item.basePriceCents === undefined || item.discountPct === undefined) return 0;
    const paidQty = item.quantity - (item.bonusQuantity ?? 0);
    return Math.round(item.basePriceCents * (1 - item.discountPct / 100)) * paidQty;
  }

  function getSelectedTier(pkgName: string): LicenseTierPrice {
    const selected = selectedLicenseTier[pkgName] || licenseTierPrices[0]?.name;
    return licenseTierPrices.find((t) => t.name === selected) || licenseTierPrices[0];
  }

  async function handleCheckout() {
    if (cartItems.length === 0) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { data: operator } = await supabase
      .from("operators")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!operator) {
      setError("Operator not found");
      setLoading(false);
      return;
    }

    const { data: order, error: orderError } = await supabase
      .from("license_orders")
      .insert({
        operator_id: operator.id,
        total_price_cents: cartTotal,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError) {
      setError(orderError.message);
      setLoading(false);
      return;
    }

    const lineItems = cartItems.map((item) => {
      if (item.isBulkPackage) {
        const paidQty = item.quantity - (item.bonusQuantity ?? 0);
        const discountedUnitPrice = Math.round(
          (item.basePriceCents ?? item.plan.priceCents) * (1 - (item.discountPct ?? 0) / 100)
        );
        return {
          order_id: order.id,
          tier_name: item.plan.name,
          tier_label: `${item.distributorTierLabel} ${item.plan.label} Package`,
          quantity: item.quantity,
          unit_price_cents: discountedUnitPrice,
          line_total_cents: discountedUnitPrice * paidQty,
          distributor_tier_name: item.distributorTierName,
          bonus_quantity: item.bonusQuantity ?? 0,
          discount_pct: item.discountPct ?? 0,
        };
      }
      return {
        order_id: order.id,
        tier_name: item.plan.name,
        tier_label: item.plan.label,
        quantity: item.quantity,
        unit_price_cents: item.plan.priceCents,
        line_total_cents: item.plan.priceCents * item.quantity,
        distributor_tier_name: null,
        bonus_quantity: 0,
        discount_pct: 0,
      };
    });

    const { error: itemsError } = await supabase
      .from("license_order_items")
      .insert(lineItems);

    if (itemsError) {
      toast(itemsError.message, "error");
      setError(itemsError.message);
      setLoading(false);
      return;
    }

    toast("Order created — redirecting to checkout");
    router.push(`/store/checkout/${order.id}`);
  }

  return (
    <>
      {/* Floating cart button */}
      {cartCount > 0 && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed top-5 right-5 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-xl shadow-primary/25 hover:bg-primary/90 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          <span>₱{(cartTotal / 100).toLocaleString()}</span>
          <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary-foreground text-primary text-[11px] font-bold">
            {cartCount}
          </span>
        </button>
      )}

      {/* Cart drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Cart drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-card border-l border-border shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <h2 className="text-lg font-bold text-foreground">Cart</h2>
            <span className="text-xs text-muted-foreground">
              {cartCount} license{cartCount !== 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">Your cart is empty</div>
          ) : (
            cartItems.map((item) => {
              const key = Object.entries(cart).find(([, v]) => v === item)?.[0] ?? item.plan.name;
              if (item.isBulkPackage) {
                const lineTotal = getBulkLineTotal(item);
                const colors = tierColors[item.distributorTierName ?? "bronze"] ?? tierColors.bronze;
                return (
                  <div key={key} className={`rounded-xl border p-4 ${colors.border} ${colors.bg}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${colors.badge}`}>
                          {item.distributorTierLabel}
                        </span>
                        <span className="text-sm font-semibold text-foreground">{item.plan.label}</span>
                      </div>
                      <button
                        onClick={() => removeBulkItem(key)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} keys ({item.bonusQuantity} bonus free)
                    </p>
                    <p className={`text-sm font-bold mt-1 ${colors.text}`}>
                      ₱{(lineTotal / 100).toLocaleString()}
                    </p>
                  </div>
                );
              }
              return (
                <div key={key} className="rounded-xl border border-border bg-card/60 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">{item.plan.label}</span>
                    <button
                      onClick={() => setQuantity(item.plan.name, item.plan, 0)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {item.plan.price}{item.plan.period} each
                  </p>
                  {/* Quantity controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setQuantity(item.plan.name, item.plan, item.quantity - 1)}
                        className="px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors text-foreground"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={item.quantity}
                        onChange={(e) => setQuantity(item.plan.name, item.plan, parseInt(e.target.value) || 0)}
                        className="w-10 text-center text-xs font-bold bg-transparent border-x border-border py-1.5 text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => setQuantity(item.plan.name, item.plan, item.quantity + 1)}
                        className="px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors text-foreground"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      ₱{((item.plan.priceCents * item.quantity) / 100).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-border p-5 shrink-0 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-foreground">₱{(cartTotal / 100).toLocaleString()}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
            >
              {loading ? "Processing..." : "Proceed to Checkout"}
            </button>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Individual Plans — grouped by product */}
      {(() => {
        const products = [...new Set(plans.map((p) => p.product))];
        const productLabels: Record<string, string> = {
          symflofi: "SymfloFi — Piso WiFi",
          playtab: "PlayTab — Tablet Gaming",
          symflokiosk: "SymfloKiosk — Payment Kiosk",
          symflowisp: "SymfloWISP — Your ISP. One box.",
        };
        return products.map((product) => (
          <div key={product} className="mb-8">
            {products.length > 1 && (
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-base font-semibold text-foreground">
                  {productLabels[product] ?? product}
                </h3>
                {product === "symflowisp" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Coming Soon</span>
                )}
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            {product === "symflowisp" ? (
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-6 text-center">
                <p className="text-muted-foreground text-sm">Pricing will be announced soon. Contact sales@symflofi.cloud for early access.</p>
              </div>
            ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {plans.filter((p) => p.product === product).map((plan) => {
          const qty = getQuantity(plan.name);
          const inCart = qty > 0;
          return (
            <div
              key={plan.name}
              className={`relative flex flex-col p-6 sm:p-7 rounded-2xl border transition-all ${
                inCart
                  ? "border-primary shadow-xl shadow-primary/15 bg-primary/5"
                  : plan.highlight
                    ? "bg-primary/5 border-primary/30 shadow-xl shadow-primary/10"
                    : "bg-card/60 backdrop-blur-sm border-border hover:border-primary/20"
              }`}
            >
              {plan.highlight && !inCart && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                  Most Popular
                </div>
              )}
              {inCart && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                  {qty} in cart
                </div>
              )}
              <h3 className="text-lg font-bold text-foreground">{plan.label}</h3>
              <div className="mt-5 mb-6">
                {plan.originalPrice && (
                  <span className="text-sm text-muted-foreground line-through mr-2">{plan.originalPrice}</span>
                )}
                <span className={`text-3xl font-bold ${plan.originalPrice ? "text-emerald-400" : "text-foreground"}`}>{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                )}
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {inCart ? (
                <div className="flex items-center border border-primary/30 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(plan.name, plan, qty - 1)}
                    className="px-4 py-3 text-sm font-medium hover:bg-primary/10 transition-colors text-primary flex-1"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={qty}
                    onChange={(e) => setQuantity(plan.name, plan, parseInt(e.target.value) || 0)}
                    className="w-14 text-center text-sm font-bold bg-transparent border-x border-primary/30 py-3 text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setQuantity(plan.name, plan, qty + 1)}
                    className="px-4 py-3 text-sm font-medium hover:bg-primary/10 transition-colors text-primary flex-1"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setQuantity(plan.name, plan, 1)}
                  className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
                      : "border border-border text-foreground hover:bg-muted"
                  }`}
                >
                  Add to Cart
                </button>
              )}
            </div>
          );
              })}
            </div>
            )}
          </div>
        ));
      })()}

      {/* Distributor Bulk Packages */}
      {bulkPackages.length > 0 && (
        <div className="mt-12">
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Distributor Packages</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Bulk license bundles with volume discounts — become a distributor automatically
            </p>
            {isDistributor && currentDistributorTier && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
                <span className="text-xs font-semibold text-primary">
                  Current tier: {currentDistributorTier.charAt(0).toUpperCase() + currentDistributorTier.slice(1)}
                </span>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {bulkPackages.map((pkg) => {
              const colors = tierColors[pkg.tierName] ?? tierColors.bronze;
              const selectedTier = getSelectedTier(pkg.tierName);
              const effectiveDiscount = operatorDiscountPct;
              const retailTotal = selectedTier.priceCents * pkg.baseQuantity;
              const discountedUnitCents = effectiveDiscount > 0
                ? Math.round(selectedTier.priceCents * (1 - effectiveDiscount / 100))
                : selectedTier.priceCents;
              const totalPrice = discountedUnitCents * pkg.baseQuantity;
              const cartKey = `bulk:${pkg.tierName}:${selectedTier.name}`;
              const inCart = !!cart[cartKey];

              return (
                <div
                  key={pkg.tierName}
                  className={`relative flex flex-col p-6 sm:p-7 rounded-2xl border transition-all ${
                    inCart
                      ? `${colors.border} shadow-xl ${colors.bg}`
                      : `${colors.bg} ${colors.border} hover:shadow-lg`
                  }`}
                >
                  {inCart && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full ${colors.badge} text-[11px] font-semibold border`}>
                      In cart
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${colors.badge}`}>
                      {pkg.tierLabel}
                    </span>
                    {effectiveDiscount > 0 && (
                      <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {effectiveDiscount}% OFF
                      </span>
                    )}
                  </div>

                  <div className="mb-1">
                    <span className={`text-3xl font-bold ${colors.text}`}>{pkg.totalQuantity}</span>
                    <span className="text-sm text-muted-foreground ml-1">keys</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-5">
                    {pkg.baseQuantity} paid + {pkg.bonusQuantity} bonus free
                  </p>

                  <label className="text-xs font-medium text-muted-foreground mb-1.5">License Tier</label>
                  <div className="relative mb-4">
                    <select
                      value={selectedLicenseTier[pkg.tierName] || licenseTierPrices[0]?.name}
                      onChange={(e) =>
                        setSelectedLicenseTier((prev) => ({ ...prev, [pkg.tierName]: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 pr-9 rounded-xl border border-border bg-card/60 text-sm text-foreground focus:outline-none focus:border-primary/40 appearance-none cursor-pointer"
                    >
                      {(() => {
                        const productLabels: Record<string, string> = {
                          symflofi: "SymfloFi",
                          playtab: "PlayTab",
                          symflokiosk: "SymfloKiosk",
                          symflowisp: "SymfloWISP",
                        };
                        const hasMultipleProducts = new Set(licenseTierPrices.map((t) => t.product)).size > 1;
                        return licenseTierPrices.map((t) => (
                          <option key={t.name} value={t.name}>
                            {hasMultipleProducts ? `[${productLabels[t.product] ?? t.product}] ` : ""}{t.label} — ₱{(t.priceCents / 100).toLocaleString()}/yr
                          </option>
                        ));
                      })()}
                    </select>
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>

                  <div className="space-y-1 mb-5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{pkg.baseQuantity} &times; ₱{(selectedTier.priceCents / 100).toLocaleString()}</span>
                      <span className={effectiveDiscount > 0 ? "line-through" : ""}>₱{(retailTotal / 100).toLocaleString()}</span>
                    </div>
                    {effectiveDiscount > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>{effectiveDiscount}% discount</span>
                        <span className="text-emerald-400">
                          -₱{((retailTotal - totalPrice) / 100).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>+{pkg.bonusQuantity} bonus keys</span>
                      <span className="text-emerald-400">FREE</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className={`text-lg font-bold ${colors.text}`}>
                        ₱{(totalPrice / 100).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60">
                      ₱{(discountedUnitCents / 100).toLocaleString()}/key effective
                    </p>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    <li className="flex items-center gap-2 text-xs text-muted-foreground">
                      <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Auto-promote to {pkg.tierLabel} distributor
                    </li>
                    <li className="flex items-center gap-2 text-xs text-muted-foreground">
                      <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {pkg.discountPct}% off all future purchases
                    </li>
                    <li className="flex items-center gap-2 text-xs text-muted-foreground">
                      <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Transfer keys to other operators
                    </li>
                    <li className="flex items-center gap-2 text-xs text-muted-foreground">
                      <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Public distributor directory listing
                    </li>
                  </ul>

                  {inCart ? (
                    <button
                      onClick={() => removeBulkItem(cartKey)}
                      className={`w-full py-3 rounded-xl border font-semibold text-sm transition-all ${colors.border} ${colors.text} hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30`}
                    >
                      Remove from Cart
                    </button>
                  ) : (
                    <button
                      onClick={() => addBulkPackage(pkg, selectedTier)}
                      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all border ${colors.border} ${colors.text} hover:shadow-lg`}
                    >
                      Add to Cart
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
