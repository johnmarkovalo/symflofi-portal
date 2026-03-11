"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { logAdminActionClient } from "@/lib/audit-client";

type Props = {
  requestId: string;
  operatorId: string;
  tier: string;
  quantity: number;
  durationMonths: number;
};

export default function RequestActions({ requestId, operatorId, tier, quantity, durationMonths }: Props) {
  const [loading, setLoading] = useState(false);
  const [showDeny, setShowDeny] = useState(false);
  const [denyReason, setDenyReason] = useState("");
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  async function handleApprove() {
    setLoading(true);

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    // Update request status first so request_id FK is valid
    await supabase
      .from("license_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", requestId);

    // Generate keys linked to this request
    if (quantity === 1) {
      const { data } = await supabase.rpc("generate_license_key", {
        p_operator_id: operatorId,
        p_tier: tier,
        p_expires_at: expiresAt.toISOString(),
      });
      // Tag the generated key with the request_id
      if (data) {
        await supabase
          .from("license_keys")
          .update({ request_id: requestId })
          .eq("key", data);
      }
    } else {
      await supabase.rpc("generate_license_keys_bulk", {
        p_operator_id: operatorId,
        p_tier: tier,
        p_expires_at: expiresAt.toISOString(),
        p_quantity: quantity,
        p_request_id: requestId,
      });
    }

    toast(`Request approved — ${quantity} key${quantity !== 1 ? "s" : ""} generated`);
    logAdminActionClient({
      action: "license_request.approve",
      entityType: "license_request",
      entityId: requestId,
      summary: `Approved license request (${quantity}x ${tier})`,
      details: { operatorId, tier, quantity, durationMonths },
    });
    setLoading(false);
    router.refresh();
  }

  async function handleDeny() {
    setLoading(true);
    await supabase
      .from("license_requests")
      .update({
        status: "denied",
        denial_reason: denyReason || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    toast("Request denied");
    logAdminActionClient({
      action: "license_request.deny",
      entityType: "license_request",
      entityId: requestId,
      summary: `Denied license request (${quantity}x ${tier})`,
      details: { operatorId, tier, quantity, durationMonths, denyReason: denyReason || null },
    });
    setLoading(false);
    setShowDeny(false);
    router.refresh();
  }

  if (showDeny) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Reason (optional)"
          value={denyReason}
          onChange={(e) => setDenyReason(e.target.value)}
          className="rounded-lg bg-muted border border-border px-2 py-1 text-xs text-foreground w-32 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button
          onClick={handleDeny}
          disabled={loading}
          className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          onClick={() => setShowDeny(false)}
          className="text-xs px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground transition-all"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
      >
        {loading ? "..." : "Approve"}
      </button>
      <button
        onClick={() => setShowDeny(true)}
        disabled={loading}
        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
      >
        Deny
      </button>
    </div>
  );
}
