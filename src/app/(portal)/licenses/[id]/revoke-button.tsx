"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { revokeLicense, type RevokeMode } from "./actions";

export default function RevokeLicenseButton({
  licenseId,
  hasOperator,
  isAdmin,
}: {
  licenseId: string;
  hasOperator: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<RevokeMode>("unbind");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  async function handleRevoke() {
    setLoading(true);
    setError("");

    try {
      const result = await revokeLicense(licenseId, { mode });
      if (result.error) {
        toast(result.error, "error");
        setError(result.error);
      } else {
        const label = mode === "unbind"
          ? "Machine unbound"
          : mode === "revoke"
            ? "License revoked"
            : "License fully revoked";
        toast(label);
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const confirmLabel = mode === "unbind"
    ? "Unbind Machine"
    : mode === "revoke"
      ? "Revoke License"
      : "Fully Revoke";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl px-4 py-2 text-sm font-medium hover:bg-red-500/20 transition-all"
      >
        {isAdmin ? "Revoke License" : "Unbind Machine"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">Revoke License</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose how to handle this license.
            </p>

            <div className="space-y-2 mb-4">
              {/* Unbind — available to all */}
              <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-all cursor-pointer">
                <input
                  type="radio"
                  name="revokeMode"
                  checked={mode === "unbind"}
                  onChange={() => setMode("unbind")}
                  className="accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Unbind from machine</p>
                  <p className="text-xs text-muted-foreground">
                    Detach from current device. Key can be activated on a different device.
                  </p>
                </div>
              </label>

              {/* Revoke (keep operator) — admin only */}
              {isAdmin && hasOperator && (
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-amber-500/30 transition-all cursor-pointer">
                  <input
                    type="radio"
                    name="revokeMode"
                    checked={mode === "revoke"}
                    onChange={() => setMode("revoke")}
                    className="accent-amber-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Revoke license</p>
                    <p className="text-xs text-muted-foreground">
                      Permanently disable the key. Stays assigned to operator for records.
                    </p>
                  </div>
                </label>
              )}

              {/* Full revoke — admin only */}
              {isAdmin && hasOperator && (
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-red-500/30 transition-all cursor-pointer">
                  <input
                    type="radio"
                    name="revokeMode"
                    checked={mode === "full_revoke"}
                    onChange={() => setMode("full_revoke")}
                    className="accent-red-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Full revoke</p>
                    <p className="text-xs text-muted-foreground">
                      Permanently disable AND remove from operator entirely.
                    </p>
                  </div>
                </label>
              )}
            </div>

            {error && (
              <p className="text-xs text-destructive mb-3">{error}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setOpen(false); setError(""); }}
                disabled={loading}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={loading}
                className="bg-red-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-all shadow-lg shadow-red-500/25"
              >
                {loading ? "Processing..." : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
