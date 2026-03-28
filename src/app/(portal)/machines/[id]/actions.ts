"use server";

import { getUserContext } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/audit";

const VPS_API_URL = process.env.VPS_API_URL || "http://api.symflofi.cloud";

export async function toggleSSH(machineId: string, enabled: boolean) {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Fetch machine details (UUID, license key, WireGuard IP)
  const { data: machine, error } = await supabase
    .from("machines")
    .select("machine_uuid, license_key, wg_ip, name, is_online")
    .eq("id", machineId)
    .single();

  if (error || !machine) {
    return { error: "Machine not found" };
  }

  if (!machine.wg_ip) {
    return { error: "No WireGuard tunnel — device has no remote access" };
  }

  if (!machine.license_key) {
    return { error: "No license key configured on device" };
  }

  // Proxy request to device through VPS
  try {
    const resp = await fetch(`${VPS_API_URL}/api/platform/ssh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": machine.machine_uuid,
        "X-Platform-Key": machine.license_key,
      },
      body: JSON.stringify({ enabled }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return { error: `Device returned ${resp.status}: ${body}` };
    }

    const result = await resp.json();

    await logAdminAction(ctx, {
      action: enabled ? "ssh.enable" : "ssh.disable",
      entityType: "machine",
      entityId: machineId,
      summary: `${enabled ? "Enabled" : "Disabled"} SSH on ${machine.name || machine.machine_uuid}`,
      details: { machine_uuid: machine.machine_uuid, enabled },
    });

    return { success: true, sshEnabled: result.sshEnabled };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("timeout") || message.includes("abort")) {
      return { error: "Device is unreachable (timeout)" };
    }
    return { error: `Failed to reach device: ${message}` };
  }
}

export async function updateMachineDetails(
  machineId: string,
  fields: { name?: string; customer_name?: string; notes?: string },
) {
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) return { error: "Unauthorized" };

  const supabase = await createClient();

  // Operators can only edit their own machines
  if (ctx.role === "operator") {
    const { data: machine } = await supabase
      .from("machines")
      .select("operator_id")
      .eq("id", machineId)
      .single();
    if (!machine || machine.operator_id !== ctx.operatorId) {
      return { error: "Unauthorized" };
    }
  }

  const update: Record<string, string | null> = {};
  if ("name" in fields) update.name = fields.name?.trim() || null;
  if ("customer_name" in fields) update.customer_name = fields.customer_name?.trim() || null;
  if ("notes" in fields) update.notes = fields.notes?.trim() || null;

  const { error } = await supabase
    .from("machines")
    .update(update)
    .eq("id", machineId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteMachine(machineId: string) {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data: machine } = await supabase
    .from("machines")
    .select("id, machine_uuid, name, license_key, operator_id")
    .eq("id", machineId)
    .single();

  if (!machine) return { error: "Machine not found" };

  // Unbind any license pointing to this machine
  if (machine.license_key) {
    await supabase
      .from("license_keys")
      .update({ machine_id: null, is_activated: false })
      .eq("machine_id", machineId);
  }

  // Delete related records first (machine_health, activity_log)
  await Promise.all([
    supabase.from("machine_health").delete().eq("machine_id", machineId),
    supabase.from("activity_log").delete().eq("machine_id", machineId),
  ]);

  // Delete the machine
  const { error: deleteError } = await supabase
    .from("machines")
    .delete()
    .eq("id", machineId);

  if (deleteError) return { error: deleteError.message };

  await logAdminAction(ctx, {
    action: "machine.delete",
    entityType: "machine",
    entityId: machineId,
    summary: `Deleted machine ${machine.name || machine.machine_uuid}`,
    details: {
      machine_uuid: machine.machine_uuid,
      license_key: machine.license_key,
      operator_id: machine.operator_id,
    },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// PlayTab Remote Commands
// ---------------------------------------------------------------------------

export async function sendPlayTabCommand(
  machineId: string,
  command: string,
  payload: Record<string, unknown> = {},
) {
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) return { error: "Unauthorized" };

  const supabase = await createClient();

  // Operators can only control their own machines
  if (ctx.role === "operator") {
    const { data: machine } = await supabase
      .from("machines")
      .select("operator_id")
      .eq("id", machineId)
      .single();
    if (!machine || machine.operator_id !== ctx.operatorId) {
      return { error: "Unauthorized" };
    }
  }

  // Insert command row — tablet picks this up via Realtime
  const { data: cmd, error } = await supabase
    .from("playtab_remote_commands")
    .insert({
      machine_id: machineId,
      command,
      payload,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Poll for result (tablet should ack + complete within a few seconds)
  const commandId = cmd.id;
  const deadline = Date.now() + 10_000; // 10s timeout

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));

    const { data: row } = await supabase
      .from("playtab_remote_commands")
      .select("status, result")
      .eq("id", commandId)
      .single();

    if (!row) return { error: "Command disappeared" };

    if (row.status === "completed") {
      return { success: true, result: row.result };
    }
    if (row.status === "failed") {
      return { error: row.result?.error ?? "Command failed on device" };
    }
    if (row.status === "expired") {
      return { error: "Command expired — device may be offline" };
    }
  }

  return { error: "Timeout — device did not respond within 10 seconds" };
}

export async function getSSHStatus(machineId: string) {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data: machine } = await supabase
    .from("machines")
    .select("machine_uuid, license_key, wg_ip")
    .eq("id", machineId)
    .single();

  if (!machine?.wg_ip || !machine?.license_key) {
    return { error: "No remote access" };
  }

  try {
    const resp = await fetch(`${VPS_API_URL}/api/platform/ssh`, {
      method: "GET",
      headers: {
        "X-Device-Id": machine.machine_uuid,
        "X-Platform-Key": machine.license_key,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      return { error: "Device unreachable" };
    }

    return await resp.json();
  } catch {
    return { error: "Device unreachable" };
  }
}
