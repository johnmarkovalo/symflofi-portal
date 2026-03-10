"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";

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

  // Update operator_id
  const { error: updateError } = await supabase
    .from("license_keys")
    .update({ operator_id: operatorId })
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

  return { success: true };
}

export async function revokeLicense(
  licenseId: string,
  options: { unbindOnly: boolean }
) {
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) {
    return { error: "Unauthorized" };
  }

  const isAdmin = ctx.role === "admin";
  const isOperator = ctx.role === "operator";

  // Operators can only unbind from machine, not full revoke
  if (isOperator && !options.unbindOnly) {
    return { error: "Operators can only unbind from machine" };
  }

  const supabase = await createClient();

  const { data: license } = await supabase
    .from("license_keys")
    .select("id, key, operator_id, machine_id, is_activated")
    .eq("id", licenseId)
    .single();

  if (!license) return { error: "License not found" };

  // Operators can only revoke their own licenses
  if (isOperator && license.operator_id !== ctx.operatorId) {
    return { error: "Unauthorized" };
  }

  if (!license.is_activated && !license.machine_id) {
    return { error: "License is not bound to any machine" };
  }

  // Unbind from machine (keep activated_at to preserve expiry clock)
  const updateFields: Record<string, unknown> = {
    machine_id: null,
    is_activated: false,
  };

  // Optionally unassign operator too (full revoke — admin only)
  if (!options.unbindOnly) {
    updateFields.operator_id = null;
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
    to_operator_id: options.unbindOnly ? license.operator_id : null,
    actor_id: ctx.operatorId ?? null,
    actor_role: actorRole,
    note: options.unbindOnly
      ? `Hardware binding revoked by ${actorRole} (license kept with operator)`
      : "License fully revoked by admin (unbound and unassigned)",
  });

  return { success: true };
}
