"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getUserContext } from "@/lib/roles";
import { logAdminAction } from "@/lib/audit";

export async function createOperator(formData: {
  name: string;
  email: string;
  password: string;
  is_distributor: boolean;
  distributor_tier: string | null;
  distributor_discount_pct: number;
}) {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const admin = createAdminClient();

  // 1. Create Supabase Auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
    user_metadata: { name: formData.name },
  });

  if (authError) {
    return { error: authError.message };
  }

  // 2. Create operators table row linked to auth user
  const { error: dbError } = await admin.from("operators").insert({
    auth_user_id: authData.user.id,
    name: formData.name,
    email: formData.email,
    is_distributor: formData.is_distributor,
    distributor_tier: formData.distributor_tier,
    distributor_discount_pct: formData.distributor_discount_pct,
  });

  if (dbError) {
    // Rollback: delete the auth user if operator insert fails
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: dbError.message };
  }

  await logAdminAction(ctx, {
    action: "operator.create",
    entityType: "operator",
    entityId: authData.user.id,
    summary: `Created operator ${formData.email}`,
    details: {
      name: formData.name,
      email: formData.email,
      is_distributor: formData.is_distributor,
      distributor_tier: formData.distributor_tier,
    },
  });

  return { success: true };
}
