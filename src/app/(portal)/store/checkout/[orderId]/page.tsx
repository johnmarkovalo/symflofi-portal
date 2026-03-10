"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  total_price_cents: number;
  status: string;
  created_at: string;
};

type OrderItem = {
  id: string;
  tier_name: string;
  tier_label: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

type PaymentMethod = "gcash" | "maya" | "bank_transfer" | "card";

const paymentMethods: { id: PaymentMethod; label: string; icon: string; description: string }[] = [
  { id: "gcash", label: "GCash", icon: "M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18", description: "Pay with GCash e-wallet" },
  { id: "maya", label: "Maya", icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z", description: "Pay with Maya e-wallet" },
  { id: "bank_transfer", label: "Bank Transfer", icon: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z", description: "Direct bank transfer (BDO, BPI, etc.)" },
  { id: "card", label: "Credit/Debit Card", icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z", description: "Visa, Mastercard" },
];

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState<"payment" | "processing" | "success" | "failed">("payment");

  // Poll for payment status after returning from provider
  const pollStatus = useCallback(async () => {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes at 2s intervals

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError("Payment confirmation timed out. Please check your Licenses page — your keys may still be issued.");
        setStep("payment");
        return;
      }
      attempts++;

      try {
        const res = await fetch(`/api/payments/status?orderId=${orderId}`);
        const data = await res.json();

        if (data.status === "paid") {
          setStep("success");
          return;
        }
        if (data.status === "failed" || data.status === "cancelled" || data.status === "expired") {
          setStep("failed");
          return;
        }

        // Still pending — poll again
        setTimeout(poll, 2000);
      } catch {
        setTimeout(poll, 3000);
      }
    };

    poll();
  }, [orderId]);

  useEffect(() => {
    async function loadOrder() {
      const [{ data: orderData, error: orderErr }, { data: itemsData }] = await Promise.all([
        supabase.from("license_orders").select("*").eq("id", orderId).single(),
        supabase.from("license_order_items").select("*").eq("order_id", orderId).order("tier_name"),
      ]);

      if (orderErr || !orderData) {
        setLoadError("Order not found");
        return;
      }

      if (orderData.status === "paid") {
        setOrder(orderData);
        setItems(itemsData ?? []);
        setStep("success");
        return;
      }

      if (orderData.status !== "pending") {
        setLoadError("This order has already been processed");
        return;
      }

      setOrder(orderData);
      setItems(itemsData ?? []);

      // If returning from payment provider, start polling
      const returnStatus = searchParams.get("status");
      if (returnStatus === "success" || returnStatus === "failed") {
        setStep("processing");
        pollStatus();
      }
    }
    loadOrder();
  }, [orderId, searchParams, pollStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalLicenses = items.reduce((sum, i) => sum + i.quantity, 0);

  async function handlePay() {
    if (!paymentMethod || !order) return;
    setProcessing(true);
    setError("");
    setStep("processing");

    try {
      const res = await fetch("/api/payments/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Failed to create payment session");
        setStep("payment");
        setProcessing(false);
        return;
      }

      // Redirect to provider's hosted payment page
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error. Please try again.");
      setStep("payment");
      setProcessing(false);
    }
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 mb-4">
          <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">{loadError}</h2>
        <button onClick={() => router.push("/store")} className="mt-4 text-sm text-primary hover:text-primary/80 font-medium">
          Back to Store
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="animate-pulse text-muted-foreground">Loading order...</div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Payment Successful!</h2>
        <p className="text-sm text-muted-foreground mb-1">
          {totalLicenses} license{totalLicenses !== 1 ? "s" : ""} purchased
        </p>
        <div className="text-xs text-muted-foreground mb-6 space-y-0.5">
          {items.map((item) => (
            <p key={item.id}>{item.quantity}&times; {item.tier_label}</p>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Your license keys have been issued and are ready in your Licenses page.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => router.push("/licenses")}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
          >
            View Licenses
          </button>
          <button
            onClick={() => router.push("/store")}
            className="px-6 py-3 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted transition-all"
          >
            Buy More
          </button>
        </div>
      </div>
    );
  }

  if (step === "failed") {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 mb-4">
          <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">Payment Failed</h2>
        <p className="text-sm text-muted-foreground mb-6">Your payment was not completed. No charges were made.</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => router.push("/store")}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
          <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">Confirming Payment</h2>
        <p className="text-sm text-muted-foreground">Please wait while we confirm your payment...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => router.push("/store")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Store
      </button>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Payment methods */}
        <div>
          <h1 className="text-xl font-bold text-foreground mb-1">Checkout</h1>
          <p className="text-sm text-muted-foreground mb-6">Select a payment method</p>

          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                  paymentMethod === method.id
                    ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                    : "border-border hover:border-primary/30 bg-card/60"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  paymentMethod === method.id
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-muted border border-border"
                }`}>
                  <svg className={`w-5 h-5 ${paymentMethod === method.id ? "text-primary" : "text-muted-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={method.icon} />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{method.label}</p>
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === method.id ? "border-primary" : "border-border"
                }`}>
                  {paymentMethod === method.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}
        </div>

        {/* Order summary */}
        <div className="lg:sticky lg:top-8 h-fit">
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>
            <div className="space-y-3 text-sm">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-foreground capitalize">{item.tier_label}</span>
                    <span className="text-muted-foreground ml-1">&times;{item.quantity}</span>
                  </div>
                  <span className="text-foreground">₱{(item.line_total_cents / 100).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">
                  ₱{(order.total_price_cents / 100).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={!paymentMethod || processing}
              className="w-full mt-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
            >
              {processing ? "Redirecting..." : `Pay ₱${(order.total_price_cents / 100).toLocaleString()}`}
            </button>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Secured by SymfloFi Payments
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
