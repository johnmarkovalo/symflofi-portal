"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { revokeLicense } from "./actions";

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
  const [unbindOnly, setUnbindOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  async function handleRevoke() {
    setLoading(true);
    setError("");

    try {
      const result = await revokeLicense(licenseId, { unbindOnly });
      if (result.error) {
        toast(result.error, "error");
        setError(result.error);
      } else {
        toast(unbindOnly ? "Machine unbound" : "License revoked");
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

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
              This will unbind the license from its machine, allowing it to be activated on a different device.
            </p>

            {isAdmin && hasOperator && (
              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-all cursor-pointer">
                  <input
                    type="radio"
                    name="revokeMode"
                    checked={unbindOnly}
                    onChange={() => setUnbindOnly(true)}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Unbind from machine only</p>
                    <p className="text-xs text-muted-foreground">Keep the license assigned to the current operator</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-red-500/30 transition-all cursor-pointer">
                  <input
                    type="radio"
                    name="revokeMode"
                    checked={!unbindOnly}
                    onChange={() => setUnbindOnly(false)}
                    className="accent-red-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Full revoke</p>
                    <p className="text-xs text-muted-foreground">Unbind from machine and unassign from operator</p>
                  </div>
                </label>
              </div>
            )}

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
                {loading ? "Revoking..." : "Confirm Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
