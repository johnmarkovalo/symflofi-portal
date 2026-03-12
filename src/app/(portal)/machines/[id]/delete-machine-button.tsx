"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMachine } from "./actions";

export default function DeleteMachineButton({ machineId, machineName }: { machineId: string; machineName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await deleteMachine(machineId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      setConfirming(false);
    } else {
      router.push("/machines");
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-medium border border-red-600/20 transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
        Delete Machine
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <span className="text-sm text-muted-foreground">Delete <strong>{machineName}</strong>?</span>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Deleting..." : "Confirm"}
      </button>
      <button
        onClick={() => { setConfirming(false); setError(null); }}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );
}
