"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { updateMachineDetails } from "./actions";

export default function MachineDetailsEdit({
  machineId,
  initialName,
  initialCustomerName,
  initialNotes,
}: {
  machineId: string;
  initialName: string;
  initialCustomerName: string;
  initialNotes: string;
}) {
  const [name, setName] = useState(initialName);
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [notes, setNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const hasChanges =
    name !== initialName ||
    customerName !== initialCustomerName ||
    notes !== initialNotes;

  async function handleSave() {
    setLoading(true);
    const result = await updateMachineDetails(machineId, {
      name,
      customer_name: customerName,
      notes,
    });
    setLoading(false);

    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Machine details updated");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Machine Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Juan's Shop - Front"
          className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Customer Name</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g., Juan Dela Cruz"
          className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g., Location: Brgy. San Jose, contact 09xx-xxx-xxxx"
          className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>
      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      )}
    </div>
  );
}
