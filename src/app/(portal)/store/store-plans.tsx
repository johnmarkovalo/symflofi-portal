"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Plan = {
  name: string;
  label: string;
  price: string;
  priceCents: number;
  period: string;
  durationDays: number;
  features: string[];
  highlight: boolean;
};

type CartItem = { plan: Plan; quantity: number };

export default function StorePlans({ plans }: { plans: Plan[] }) {
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const cartItems = Object.values(cart).filter((i) => i.quantity > 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.plan.priceCents * i.quantity, 0);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

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

    // Create order
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

    // Create line items
    const { error: itemsError } = await supabase
      .from("license_order_items")
      .insert(
        cartItems.map((item) => ({
          order_id: order.id,
          tier_name: item.plan.name,
          tier_label: item.plan.label,
          quantity: item.quantity,
          unit_price_cents: item.plan.priceCents,
          line_total_cents: item.plan.priceCents * item.quantity,
        }))
      );

    if (itemsError) {
      setError(itemsError.message);
      setLoading(false);
      return;
    }

    router.push(`/store/checkout/${order.id}`);
  }

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {plans.map((plan) => {
          const qty = getQuantity(plan.name);
          const inCart = qty > 0;
          const isFree = plan.priceCents === 0;
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
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
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

              {isFree ? (
                <div className="text-center py-3 rounded-xl text-sm font-semibold text-muted-foreground border border-border">
                  Current Plan
                </div>
              ) : inCart ? (
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

      {/* Cart summary bar */}
      {cartItems.length > 0 && (
        <div className="mt-8 bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-5 sm:p-6">
          <div className="space-y-3 mb-5">
            {cartItems.map((item) => (
              <div key={item.plan.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">{item.plan.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.plan.price}{item.plan.period} &times; {item.quantity}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">
                    ₱{((item.plan.priceCents * item.quantity) / 100).toLocaleString()}
                  </span>
                  <button
                    onClick={() => setQuantity(item.plan.name, item.plan, 0)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{cartCount} license{cartCount !== 1 ? "s" : ""} total</p>
              <p className="text-xl font-bold text-foreground">₱{(cartTotal / 100).toLocaleString()}</p>
            </div>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
            >
              {loading ? "Processing..." : "Proceed to Checkout"}
            </button>
          </div>

          {error && (
            <p className="mt-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}
