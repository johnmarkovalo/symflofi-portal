"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LocalTime } from "@/components/local-time";

type License = {
  id: string;
  key: string;
  tier: string;
  is_activated: boolean;
  created_at: string;
  operator_id: string | null;
  operators: { name: string | null; email: string } | null;
  machines: { id: string; machine_uuid: string; name: string | null } | null;
};

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    enterprise: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    pro: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    lite: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    demo: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${styles[tier] ?? styles.demo}`}>
      {tier}
    </span>
  );
}

function StatusBadge({ activated }: { activated: boolean }) {
  return activated ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
      activated
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">
      unbound
    </span>
  );
}

export default function LicenseTable({
  licenses,
  isAdmin,
  operatorId,
}: {
  licenses: License[];
  isAdmin: boolean;
  operatorId: string | null;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showTransfer, setShowTransfer] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  // Only unbound keys owned by current operator can be transferred
  const transferable = licenses.filter(
    (l) => !l.is_activated && l.operator_id === operatorId
  );
  const canTransfer = !isAdmin && transferable.length > 0;
  const [confirmStep, setConfirmStep] = useState(false);

  const allTransferableSelected =
    transferable.length > 0 && transferable.every((l) => selected.has(l.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allTransferableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transferable.map((l) => l.id)));
    }
  }

  function openTransferModal() {
    setError("");
    setSuccess("");
    setRecipient("");
    setConfirmStep(false);
    setShowTransfer(true);
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) return;
    setLoading(true);
    setError("");
    setSuccess("");

    const supabase = createClient();

    // Get current operator
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { data: currentOperator } = await supabase
      .from("operators")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!currentOperator) {
      setError("Operator not found");
      setLoading(false);
      return;
    }

    // Find recipient by email, operator code, or operator ID
    const trimmed = recipient.trim();
    let recipientQuery = supabase
      .from("operators")
      .select("id, name, email");

    if (trimmed.includes("@")) {
      recipientQuery = recipientQuery.eq("email", trimmed.toLowerCase());
    } else if (trimmed.toUpperCase().startsWith("SYMF-")) {
      recipientQuery = recipientQuery.eq("operator_code", trimmed.toUpperCase());
    } else {
      recipientQuery = recipientQuery.eq("id", trimmed);
    }

    const { data: recipientOp } = await recipientQuery.single();

    if (!recipientOp) {
      setError(`No operator found with: ${recipient}`);
      setLoading(false);
      return;
    }

    if (recipientOp.id === currentOperator.id) {
      setError("Cannot transfer to yourself");
      setLoading(false);
      return;
    }

    // Get selected license details
    const selectedLicenses = licenses.filter((l) => selected.has(l.id));

    // Validate all selected are transferable
    const invalid = selectedLicenses.find(
      (l) => l.is_activated || l.operator_id !== currentOperator.id
    );
    if (invalid) {
      setError(`License ${invalid.key} is not transferable`);
      setLoading(false);
      return;
    }

    // Transfer all selected keys
    const { error: updateError } = await supabase
      .from("license_keys")
      .update({ operator_id: recipientOp.id })
      .in("id", selectedLicenses.map((l) => l.id));

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Log all transfers
    await supabase.from("license_audit_log").insert(
      selectedLicenses.map((l) => ({
        license_key_id: l.id,
        license_key: l.key,
        event: "transferred",
        from_operator_id: currentOperator.id,
        to_operator_id: recipientOp.id,
        actor_id: currentOperator.id,
        actor_role: "operator",
        note: `Transferred to ${recipientOp.name || recipientOp.email}`,
      }))
    );

    setSuccess(
      `${selectedLicenses.length} license${selectedLicenses.length !== 1 ? "s" : ""} transferred to ${recipientOp.name || recipientOp.email}`
    );
    setSelected(new Set());
    setLoading(false);
    setTimeout(() => {
      setShowTransfer(false);
      router.refresh();
    }, 1500);
  }

  return (
    <>
      {/* Selection toolbar */}
      {canTransfer && selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <span className="text-sm text-foreground font-medium">
            {selected.size} key{selected.size !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={openTransferModal}
            className="ml-auto text-sm px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all shadow-sm shadow-primary/25"
          >
            Transfer Selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all"
          >
            Clear
          </button>
        </div>
      )}

      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border">
              {canTransfer && (
                <th className="w-10 px-4 py-3.5 md:px-5">
                  <input
                    type="checkbox"
                    checked={allTransferableSelected}
                    onChange={toggleAll}
                    className="rounded border-border accent-primary"
                    title="Select all unbound keys"
                  />
                </th>
              )}
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Key</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Tier</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Status</th>
              {isAdmin && (
                <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Operator</th>
              )}
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Machine</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Created</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5"></th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((lic) => {
              const isTransferable = !lic.is_activated && lic.operator_id === operatorId;
              const isChecked = selected.has(lic.id);
              return (
                <tr
                  key={lic.id}
                  className={`border-b border-border/50 transition-colors ${
                    isChecked ? "bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  {canTransfer && (
                    <td className="w-10 px-4 py-4 md:px-5">
                      {isTransferable ? (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(lic.id)}
                          className="rounded border-border accent-primary"
                        />
                      ) : (
                        <span className="block w-4" />
                      )}
                    </td>
                  )}
                  <td className="px-5 py-4 font-mono text-sm text-foreground">{lic.key}</td>
                  <td className="px-5 py-4"><TierBadge tier={lic.tier} /></td>
                  <td className="px-5 py-4"><StatusBadge activated={lic.is_activated} /></td>
                  {isAdmin && (
                    <td className="px-5 py-4 text-muted-foreground">
                      {lic.operators?.name || lic.operators?.email || "-"}
                    </td>
                  )}
                  <td className="px-5 py-4">
                    {lic.machines ? (
                      <Link href={`/machines/${lic.machines.id}`} className="text-primary hover:text-primary/80 font-mono text-xs transition-colors">
                        {lic.machines.name || lic.machines.machine_uuid.slice(0, 12)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-xs">Unbound</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    <LocalTime date={lic.created_at} dateOnly />
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/licenses/${lic.id}`}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Info
                    </Link>
                  </td>
                </tr>
              );
            })}
            {licenses.length === 0 && (
              <tr>
                <td colSpan={canTransfer ? (isAdmin ? 8 : 7) : (isAdmin ? 7 : 6)} className="px-5 py-12 text-center text-muted-foreground">
                  No license keys yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Transfer modal */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !loading && setShowTransfer(false)}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-foreground mb-1">Transfer Licenses</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Transfer {selected.size} unbound key{selected.size !== 1 ? "s" : ""} to another operator
            </p>

            <form onSubmit={(e) => { e.preventDefault(); if (!confirmStep) { setConfirmStep(true); } else { handleTransfer(e); } }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Recipient Operator Code or Email
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => { setRecipient(e.target.value); setConfirmStep(false); }}
                  required
                  autoFocus
                  className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  placeholder="SYMF-XX00-XXXX-XXXX or email"
                />
              </div>

              {/* Selected keys preview */}
              <div className="max-h-32 overflow-y-auto rounded-xl bg-muted/50 border border-border p-3 space-y-1">
                {licenses
                  .filter((l) => selected.has(l.id))
                  .map((l) => (
                    <div key={l.id} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-foreground">{l.key}</span>
                      <TierBadge tier={l.tier} />
                    </div>
                  ))}
              </div>

              {/* Irreversible warning on confirm step */}
              {confirmStep && !success && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                  <p className="text-sm font-medium text-amber-400 mb-1">This action cannot be undone</p>
                  <p className="text-xs text-amber-400/80">
                    Once transferred, you will lose access to {selected.size === 1 ? "this license" : `these ${selected.size} licenses`}. Only an admin can transfer them back.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              {success && (
                <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                  {success}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { if (confirmStep) { setConfirmStep(false); } else { setShowTransfer(false); } }}
                  disabled={loading}
                  className="flex-1 bg-muted text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted/80 border border-border transition-all disabled:opacity-50"
                >
                  {confirmStep ? "Back" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={loading || !!success}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 transition-all shadow-lg ${
                    confirmStep
                      ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/25"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25"
                  }`}
                >
                  {loading ? "Transferring..." : confirmStep ? "Confirm Transfer" : "Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
