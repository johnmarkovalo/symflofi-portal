"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import { logAdminAction } from "@/lib/audit";

export async function assignLicenseOperator(licenseId: string, operatorId: string | null) {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Get current license info
  const { data: license } = await supabase
    .from("license_keys")
    .select("id, key, operator_id, is_activated")
    .eq("id", licenseId)
    .single();

  if (!license) return { error: "License not found" };

  const previousOperatorId = license.operator_id;

  // Update operator_id (clear revoked flag when re-assigning)
  const { error: updateError } = await supabase
    .from("license_keys")
    .update({ operator_id: operatorId, is_revoked: false })
    .eq("id", licenseId);

  if (updateError) return { error: updateError.message };

  // Log the action
  if (operatorId && previousOperatorId && operatorId !== previousOperatorId) {
    // Transfer
    await supabase.from("license_audit_log").insert({
      license_key_id: license.id,
      license_key: license.key,
      event: "transferred",
      from_operator_id: previousOperatorId,
      to_operator_id: operatorId,
      actor_id: ctx.operatorId ?? null,
      actor_role: "admin",
      note: "Reassigned by admin",
    });
  } else if (operatorId && !previousOperatorId) {
    // Assign
    await supabase.from("license_audit_log").insert({
      license_key_id: license.id,
      license_key: license.key,
      event: "assigned",
      to_operator_id: operatorId,
      actor_id: ctx.operatorId ?? null,
      actor_role: "admin",
      note: "Assigned by admin",
    });
  } else if (!operatorId && previousOperatorId) {
    // Unassign
    await supabase.from("license_audit_log").insert({
      license_key_id: license.id,
      license_key: license.key,
      event: "revoked",
      from_operator_id: previousOperatorId,
      actor_id: ctx.operatorId ?? null,
      actor_role: "admin",
      note: "Unassigned by admin",
    });
  }

  const actionType = operatorId && previousOperatorId && operatorId !== previousOperatorId
    ? "license.transfer"
    : operatorId && !previousOperatorId
      ? "license.assign"
      : "license.unassign";

  await logAdminAction(ctx, {
    action: actionType,
    entityType: "license",
    entityId: licenseId,
    summary: `${actionType.split(".")[1].charAt(0).toUpperCase() + actionType.split(".")[1].slice(1)}ed license ${license.key}`,
    details: {
      licenseKey: license.key,
      previousOperatorId,
      newOperatorId: operatorId,
    },
  });

  return { success: true };
}

export type RevokeMode = "unbind" | "revoke" | "full_revoke";

export async function revokeLicense(
  licenseId: string,
  options: { mode: RevokeMode }
) {
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) {
    return { error: "Unauthorized" };
  }

  const isAdmin = ctx.role === "admin";
  const isOperator = ctx.role === "operator";

  // Operators can only unbind from machine
  if (isOperator && options.mode !== "unbind") {
    return { error: "Operators can only unbind from machine" };
  }

  const supabase = await createClient();

  const { data: license } = await supabase
    .from("license_keys")
    .select("id, key, operator_id, machine_id, is_activated, machine_uuid:machines(machine_uuid)")
    .eq("id", licenseId)
    .single();

  if (!license) return { error: "License not found" };

  if (!license.is_activated && !license.machine_id) {
    return { error: "License is not bound to any machine" };
  }

  // Get the machine UUID before decommissioning (for unbind blocklist)
  let unboundMachineUuid: string | null = null;
  if (license.machine_id) {
    const { data: machine } = await supabase
      .from("machines")
      .select("machine_uuid")
      .eq("id", license.machine_id)
      .single();
    unboundMachineUuid = machine?.machine_uuid ?? null;

    // Decommission the machine row
    await supabase
      .from("machines")
      .update({
        license_key: null,
        license_tier: null,
        license_expires_at: null,
        is_online: false,
        status: "decommissioned",
      })
      .eq("id", license.machine_id);
  }

  // Build update fields based on mode
  const updateFields: Record<string, unknown> = {
    machine_id: null,
    is_activated: false,
  };

  let eventNote: string;

  switch (options.mode) {
    case "unbind":
      // Unbind from machine, keep with operator, can reuse on DIFFERENT device
      // Store the unbound machine UUID so validate_license can block re-binding
      if (unboundMachineUuid) {
        updateFields.unbound_from_uuid = unboundMachineUuid;
      }
      eventNote = "Hardware binding removed — license can be activated on a different device";
      break;

    case "revoke":
      // Disable the key permanently, keep assigned to operator
      updateFields.is_revoked = true;
      eventNote = "License revoked — key disabled but remains assigned to operator";
      break;

    case "full_revoke":
      // Disable the key AND remove from operator
      updateFields.is_revoked = true;
      updateFields.operator_id = null;
      eventNote = "License fully revoked — key disabled and unassigned from operator";
      break;
  }

  const { error: updateError } = await supabase
    .from("license_keys")
    .update(updateFields)
    .eq("id", licenseId);

  if (updateError) return { error: updateError.message };

  const actorRole = isAdmin ? "admin" : "operator";

  // Log revocation
  await supabase.from("license_audit_log").insert({
    license_key_id: license.id,
    license_key: license.key,
    event: "revoked",
    from_operator_id: license.operator_id,
    to_operator_id: options.mode === "full_revoke" ? null : license.operator_id,
    actor_id: ctx.operatorId ?? null,
    actor_role: actorRole,
    note: eventNote,
  });

  const summaryLabel = options.mode === "unbind"
    ? "unbind"
    : options.mode === "revoke"
      ? "revoke (keep operator)"
      : "full revoke";

  await logAdminAction(ctx, {
    action: "license.revoke",
    entityType: "license",
    entityId: licenseId,
    summary: `${summaryLabel}: ${license.key}`,
    details: {
      licenseKey: license.key,
      mode: options.mode,
      operatorId: license.operator_id,
      machineId: license.machine_id,
      unboundMachineUuid,
    },
  });

  return { success: true };
}
