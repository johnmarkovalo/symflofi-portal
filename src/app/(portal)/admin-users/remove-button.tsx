"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { removeAdmin } from "./actions";

export function RemoveAdminButton({ adminId }: { adminId: string }) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleRemove() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setLoading(true);
    const result = await removeAdmin(adminId);
    if (result.error) {
      toast(result.error, "error");
      setLoading(false);
      setConfirming(false);
      return;
    }
    toast("Admin removed successfully");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="inline-flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleRemove}
          disabled={loading}
          className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "Removing..." : "Confirm"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleRemove}
      className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
    >
      Remove
    </button>
  );
}
