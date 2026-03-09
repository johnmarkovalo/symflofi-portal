"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function TransferLicensePage() {
  const [licenseKey, setLicenseKey] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // 1. Get current operator
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { data: currentOperator } = await supabase
      .from("operators")
      .select("id, is_distributor")
      .eq("auth_user_id", user.id)
      .single();

    if (!currentOperator?.is_distributor) {
      setError("Only distributors can transfer licenses");
      setLoading(false);
      return;
    }

    // 2. Find the license key in our pool
    const { data: license } = await supabase
      .from("license_keys")
      .select("id, key, operator_id, is_activated")
      .eq("key", licenseKey.trim().toUpperCase())
      .single();

    if (!license) {
      setError("License key not found");
      setLoading(false);
      return;
    }

    if (license.operator_id !== currentOperator.id) {
      setError("This license key is not in your pool");
      setLoading(false);
      return;
    }

    if (license.is_activated) {
      setError("Cannot transfer an activated license. Only unactivated keys can be transferred.");
      setLoading(false);
      return;
    }

    // 3. Find recipient operator by email
    const { data: recipient } = await supabase
      .from("operators")
      .select("id, name, email")
      .eq("email", recipientEmail.trim().toLowerCase())
      .single();

    if (!recipient) {
      setError(`No operator found with email: ${recipientEmail}`);
      setLoading(false);
      return;
    }

    if (recipient.id === currentOperator.id) {
      setError("Cannot transfer to yourself");
      setLoading(false);
      return;
    }

    // 4. Transfer: update operator_id
    const { error: updateError } = await supabase
      .from("license_keys")
      .update({ operator_id: recipient.id })
      .eq("id", license.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // 5. Log the transfer
    await supabase.from("license_audit_log").insert({
      license_key_id: license.id,
      license_key: license.key,
      event: "transferred",
      from_operator_id: currentOperator.id,
      to_operator_id: recipient.id,
      actor_id: currentOperator.id,
      actor_role: "operator",
      note: `Transferred to ${recipient.name || recipient.email}`,
    });

    setSuccess(`License ${license.key} transferred to ${recipient.name || recipient.email}`);
    setLicenseKey("");
    setRecipientEmail("");
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Transfer License</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Transfer an unactivated license key from your pool to another operator
        </p>
      </div>

      <form onSubmit={handleTransfer} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 sm:p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">License Key</label>
          <input
            type="text"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            required
            className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground/50 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            placeholder="SFPR-XXXX-XXXX-XXXX"
          />
          <p className="text-xs text-muted-foreground mt-1.5">Must be an unactivated key in your license pool</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Recipient Email</label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            required
            className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            placeholder="operator@example.com"
          />
          <p className="text-xs text-muted-foreground mt-1.5">The operator must have an existing SymfloFi account</p>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">{error}</p>
        )}

        {success && (
          <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">{success}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-muted text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted/80 border border-border transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
          >
            {loading ? "Transferring..." : "Transfer"}
          </button>
        </div>
      </form>

      {/* Info box */}
      <div className="mt-6 bg-card/50 rounded-2xl border border-border p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground mb-2">How transfers work</h3>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">1.</span>
            Only <strong className="text-foreground">unactivated</strong> keys in your license pool can be transferred.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">2.</span>
            The recipient must have an existing SymfloFi operator account.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">3.</span>
            Once transferred, the key appears in the recipient&apos;s Licenses page.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">4.</span>
            All transfers are logged in the license audit trail.
          </li>
        </ul>
      </div>
    </div>
  );
}
