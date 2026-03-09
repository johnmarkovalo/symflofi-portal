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
