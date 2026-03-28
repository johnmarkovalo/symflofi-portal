"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { LocalTime } from "@/components/local-time";
import SearchableSelect from "@/components/searchable-select";
import Pagination from "@/components/pagination";

type License = {
  id: string;
  key: string;
  tier: string;
  product: string | null;
  is_activated: boolean;
  is_revoked: boolean;
  activated_at: string | null;
  duration_days: number;
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

function ProductBadge({ product }: { product: string | null }) {
  const p = product ?? "symflofi";
  const styles: Record<string, string> = {
    symflofi: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    playtab: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    symflowisp: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };
  const labels: Record<string, string> = { symflofi: "SymfloFi", playtab: "PlayTab", symflowisp: "SymfloWISP" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${styles[p] ?? styles.symflofi}`}>
      {labels[p] ?? p}
    </span>
  );
}

function StatusBadge({ activated, revoked }: { activated: boolean; revoked: boolean }) {
  if (revoked) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border bg-red-500/10 text-red-400 border-red-500/20">
        revoked
      </span>
    );
  }
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

function getExpiresAt(lic: License): Date | null {
  if (!lic.activated_at) return null;
  const activated = new Date(lic.activated_at);
  activated.setDate(activated.getDate() + lic.duration_days);
  return activated;
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
  const [refreshing, startTransition] = useTransition();
  const [productFilter, setProductFilter] = useState<"all" | "symflofi" | "playtab" | "symflowisp">("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "activated" | "unbound" | "revoked" | "expired">("all");
  const [tierFilter, setTierFilter] = useState<"all" | string>("all");
  const [operatorFilter, setOperatorFilter] = useState<"all" | string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showTransfer, setShowTransfer] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otpId, setOtpId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [recipientInfo, setRecipientInfo] = useState<{ name: string | null; email: string } | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Only unbound keys owned by current operator can be transferred
  const transferable = licenses.filter(
    (l) => !l.is_activated && l.operator_id === operatorId
  );
  const canTransfer = !isAdmin && transferable.length > 0;

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
    setOtpStep(false);
    setOtpId("");
    setOtpCode("");
    setRecipientInfo(null);
    setShowTransfer(true);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0 || !recipient.trim()) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transfer-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "send",
          license_ids: [...selected],
          recipient_identifier: recipient.trim(),
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to send verification code");
      setLoading(false);
      return;
    }

    setOtpId(data.otp_id);
    setRecipientInfo(data.recipient);
    setOtpStep(true);
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpId || !otpCode.trim()) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transfer-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "verify",
          otp_id: otpId,
          otp_code: otpCode.trim(),
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Verification failed");
      setLoading(false);
      return;
    }

    const recipientName = data.recipient?.name || data.recipient?.email || "operator";
    const msg = `${data.transferred} license${data.transferred !== 1 ? "s" : ""} transferred to ${recipientName}`;
    setSuccess(msg);
    toast(msg);
    setSelected(new Set());
    setLoading(false);
    setTimeout(() => {
      setShowTransfer(false);
      router.refresh();
    }, 1500);
  }

  // Derive unique tiers and operators for filter dropdowns
  const tiers = [...new Set(licenses.map((l) => l.tier))].sort();
  const operators = isAdmin
    ? [...new Map(licenses.filter((l) => l.operators).map((l) => [l.operator_id, l.operators!])).entries()]
        .map(([id, op]) => ({ id: id!, name: op.name, email: op.email }))
        .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
    : [];

  const searchLower = search.toLowerCase();

  const filteredLicenses = licenses.filter((l) => {
    // Product filter
    if (productFilter !== "all" && (l.product ?? "symflofi") !== productFilter) return false;
    // Status filter
    if (statusFilter === "revoked" && !l.is_revoked) return false;
    if (statusFilter === "activated" && (!l.is_activated || l.is_revoked)) return false;
    if (statusFilter === "unbound" && (l.is_activated || l.is_revoked)) return false;
    if (statusFilter === "expired") {
      const expires = getExpiresAt(l);
      if (!expires || expires >= new Date() || l.is_revoked) return false;
    }
    // Tier filter
    if (tierFilter !== "all" && l.tier !== tierFilter) return false;
    // Operator filter
    if (operatorFilter !== "all" && l.operator_id !== operatorFilter) return false;
    // Search
    if (searchLower) {
      const haystack = [
        l.key,
        l.operators?.name,
        l.operators?.email,
        l.machines?.name,
        l.machines?.machine_uuid,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(searchLower)) return false;
    }
    return true;
  });

  // Reset to page 1 when filters change
  const filterKey = `${productFilter}|${search}|${statusFilter}|${tierFilter}|${operatorFilter}`;
  const prevFilterKey = useRef(filterKey);
  if (prevFilterKey.current !== filterKey) {
    prevFilterKey.current = filterKey;
    if (currentPage !== 1) setCurrentPage(1);
  }

  const totalFiltered = filteredLicenses.length;
  const totalPages = Math.ceil(totalFiltered / perPage);
  const paginatedLicenses = filteredLicenses.slice((currentPage - 1) * perPage, currentPage * perPage);

  const productTabs: { key: "all" | "symflofi" | "playtab" | "symflowisp"; label: string }[] = [
    { key: "all", label: `All (${licenses.length})` },
    { key: "symflofi", label: `SymfloFi (${licenses.filter((l) => (l.product ?? "symflofi") === "symflofi").length})` },
    { key: "playtab", label: `PlayTab (${licenses.filter((l) => l.product === "playtab").length})` },
    { key: "symflowisp", label: `SymfloWISP (${licenses.filter((l) => l.product === "symflowisp").length})` },
  ];

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search keys, operators, machines..."
              className="w-full rounded-xl bg-muted/50 border border-border pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={() => startTransition(() => router.refresh())}
            disabled={refreshing}
            className="rounded-xl bg-muted/50 border border-border p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
            title="Refresh data"
          >
            <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M21.015 4.356v4.992" />
            </svg>
          </button>

          {/* Status filter */}
          <SearchableSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as typeof statusFilter)}
            placeholder="All statuses"
            options={[
              { value: "all", label: "All statuses" },
              { value: "activated", label: "Activated" },
              { value: "unbound", label: "Unbound" },
              { value: "revoked", label: "Revoked" },
              { value: "expired", label: "Expired" },
            ]}
          />

          {/* Tier filter */}
          <SearchableSelect
            value={tierFilter}
            onChange={setTierFilter}
            placeholder="All tiers"
            options={[
              { value: "all", label: "All tiers" },
              ...tiers.map((t) => ({ value: t, label: t })),
            ]}
          />

          {/* Operator filter (admin only) */}
          {isAdmin && operators.length > 0 && (
            <SearchableSelect
              value={operatorFilter}
              onChange={setOperatorFilter}
              placeholder="All operators"
              options={[
                { value: "all", label: "All operators" },
                ...operators.map((op) => ({ value: op.id, label: op.name || op.email })),
              ]}
            />
          )}
        </div>

        <div className="flex items-center justify-between">
          {/* Product tabs */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 w-fit">
            {productTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setProductFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  productFilter === tab.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Result count */}
          <span className="text-xs text-muted-foreground">
            {filteredLicenses.length} of {licenses.length} licenses
          </span>
        </div>
      </div>

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

      <div className="relative bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-x-auto">
        {refreshing && (
          <div className="absolute inset-x-0 top-0 z-10 h-1 overflow-hidden rounded-t-2xl">
            <div className="h-full w-1/3 bg-primary animate-[loading_1s_ease-in-out_infinite]" />
          </div>
        )}
        <table className={`w-full text-sm min-w-[600px] ${refreshing ? "opacity-50" : ""}`}>
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
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Product</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Tier</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Status</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Expires</th>
              {isAdmin && (
                <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Operator</th>
              )}
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Machine</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Created</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5"></th>
            </tr>
          </thead>
          <tbody>
            {paginatedLicenses.map((lic) => {
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
                  <td className="px-5 py-4"><ProductBadge product={lic.product} /></td>
                  <td className="px-5 py-4"><TierBadge tier={lic.tier} /></td>
                  <td className="px-5 py-4"><StatusBadge activated={lic.is_activated} revoked={lic.is_revoked} /></td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {(() => {
                      const expires = getExpiresAt(lic);
                      if (!expires) return <span className="text-xs">—</span>;
                      const isExpired = expires < new Date();
                      return (
                        <span className={`text-xs ${isExpired ? "text-red-400" : ""}`}>
                          <LocalTime date={expires.toISOString()} dateOnly />
                        </span>
                      );
                    })()}
                  </td>
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
            {paginatedLicenses.length === 0 && (
              <tr>
                <td colSpan={canTransfer ? (isAdmin ? 10 : 9) : (isAdmin ? 9 : 8)} className="px-5 py-12 text-center text-muted-foreground">
                  {licenses.length === 0 ? "No license keys yet" : "No licenses match the selected filter"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        mode="client"
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalFiltered}
        perPage={perPage}
        onPageChange={setCurrentPage}
        onPerPageChange={(n) => { setPerPage(n); setCurrentPage(1); }}
      />

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
              {otpStep
                ? `Enter the verification code sent to your email`
                : `Transfer ${selected.size} unbound key${selected.size !== 1 ? "s" : ""} to another operator`}
            </p>

            {!otpStep ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    Recipient Operator Code or Email
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
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

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTransfer(false)}
                    disabled={loading}
                    className="flex-1 bg-muted text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted/80 border border-border transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 transition-all shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25"
                  >
                    {loading ? "Sending code..." : "Send Verification Code"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {recipientInfo && (
                  <div className="rounded-xl bg-muted/50 border border-border px-4 py-3">
                    <p className="text-xs text-muted-foreground">Transferring to</p>
                    <p className="text-sm font-medium text-foreground">
                      {recipientInfo.name || recipientInfo.email}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    autoFocus
                    maxLength={6}
                    inputMode="numeric"
                    className="w-full rounded-xl bg-muted border border-border px-4 py-3 text-center text-lg font-mono tracking-[0.3em] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    placeholder="000000"
                  />
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                  <p className="text-sm font-medium text-amber-400 mb-1">This action cannot be undone</p>
                  <p className="text-xs text-amber-400/80">
                    Once transferred, you will lose access to {selected.size === 1 ? "this license" : `these ${selected.size} licenses`}. Only an admin can transfer them back.
                  </p>
                </div>

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
                    onClick={() => { setOtpStep(false); setOtpCode(""); setError(""); }}
                    disabled={loading}
                    className="flex-1 bg-muted text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted/80 border border-border transition-all disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6 || !!success}
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 transition-all shadow-lg bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/25"
                  >
                    {loading ? "Verifying..." : "Confirm Transfer"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
