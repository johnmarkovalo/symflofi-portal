"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { recordCreditPayment } from "./actions";

export default function RecordPayment({
  orderId,
  remainingCents,
}: {
  orderId: string;
  remainingCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleSubmit() {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      toast("Enter a valid amount", "error");
      return;
    }

    setLoading(true);
    const result = await recordCreditPayment(orderId, cents, method, notes);
    setLoading(false);

    if (result.error) {
      toast(result.error, "error");
      return;
    }

    toast(result.fullyPaid ? "Credit fully paid!" : "Payment recorded");
    setOpen(false);
    setAmount("");
    setNotes("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Record Payment
      </button>
    );
  }

  return (
    <div className="mt-3 bg-muted/50 border border-border rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Record Payment</h4>
      <p className="text-xs text-muted-foreground">
        Remaining: {"\u20B1"}{(remainingCents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Amount ({"\u20B1"})</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max={remainingCents / 100}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="cash">Cash</option>
            <option value="gcash">GCash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="maya">Maya</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Partial payment via GCash"
          className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-foreground border border-border hover:bg-muted/80 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-all"
        >
          {loading ? "Recording..." : "Confirm Payment"}
        </button>
        <button
          onClick={() => { setAmount(String(remainingCents / 100)); }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Pay Full
        </button>
      </div>
    </div>
  );
}
