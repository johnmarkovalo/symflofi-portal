"use client";

import { useState, useEffect } from "react";
import { toggleSSH, getSSHStatus } from "./actions";
import { useToast } from "@/components/toast";

export default function SSHToggle({ machineId, isOnline }: { machineId: string; isOnline: boolean }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setLoading(false);
      return;
    }
    getSSHStatus(machineId).then((res) => {
      if ("sshEnabled" in res) {
        setEnabled(res.sshEnabled as boolean);
      }
      setLoading(false);
    });
  }, [machineId, isOnline]);

  async function handleToggle() {
    if (enabled === null) return;
    const newState = !enabled;
    setToggling(true);

    const res = await toggleSSH(machineId, newState);

    if (res.error) {
      toast(res.error, "error");
    } else {
      setEnabled(newState);
      toast(`SSH ${newState ? "enabled" : "disabled"}`, "success");
    }

    setToggling(false);
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
          </svg>
          SSH: Unknown (offline)
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-xs">
        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <span className="text-muted-foreground">SSH:</span>
        {loading ? (
          <span className="text-zinc-500">checking...</span>
        ) : (
          <span className={enabled ? "text-emerald-400" : "text-red-400"}>
            {enabled ? "Enabled" : "Disabled"}
          </span>
        )}
      </div>
      {!loading && enabled !== null && (
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            enabled
              ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
          }`}
        >
          {toggling ? "..." : enabled ? "Disable" : "Enable"}
        </button>
      )}
    </div>
  );
}
