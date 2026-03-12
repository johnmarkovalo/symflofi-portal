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
