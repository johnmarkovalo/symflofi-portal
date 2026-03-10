"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getUserContext } from "@/lib/roles";

export async function getAdminUsersWithEmails() {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") {
    return { error: "Unauthorized", admins: [] };
  }

  const admin = createAdminClient();

  const { data: adminUsers } = await admin
    .from("admin_users")
    .select("id, auth_user_id, created_at")
    .order("created_at", { ascending: false });

  if (!adminUsers || adminUsers.length === 0) {
    return { admins: [] };
  }

  // Resolve emails from auth.users via admin API
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? "unknown"]),
  );

  const admins = adminUsers.map((a) => ({
    id: a.id,
    auth_user_id: a.auth_user_id,
    email: emailMap.get(a.auth_user_id) ?? "unknown",
    created_at: a.created_at,
  }));

  return { admins };
}

export async function addAdmin(formData: {
  mode: "existing" | "new";
  email: string;
  name?: string;
  password?: string;
}) {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const admin = createAdminClient();

  let authUserId: string;

  if (formData.mode === "existing") {
    // Find existing auth user by email
    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const user = authUsers?.users?.find((u) => u.email === formData.email);

    if (!user) {
      return { error: "No user found with that email. They must sign up first, or use 'Create new account' instead." };
    }

    authUserId = user.id;
  } else {
    // Create a new auth user
    if (!formData.password || formData.password.length < 6) {
      return { error: "Password must be at least 6 characters." };
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
      user_metadata: { name: formData.name || "Admin" },
    });

    if (authError) {
      return { error: authError.message };
    }

    authUserId = authData.user.id;
  }

  // Check if already an admin
  const { data: existing } = await admin
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  if (existing) {
    return { error: "This user is already an admin." };
  }

  const { error: dbError } = await admin
    .from("admin_users")
    .insert({ auth_user_id: authUserId, email: formData.email });

  if (dbError) {
    // Rollback: if we created a new user, delete them
    if (formData.mode === "new") {
      await admin.auth.admin.deleteUser(authUserId);
    }
    return { error: dbError.message };
  }

  return { success: true };
}

export async function removeAdmin(adminId: string) {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const admin = createAdminClient();

  // Prevent removing yourself
  const { data: record } = await admin
    .from("admin_users")
    .select("auth_user_id")
    .eq("id", adminId)
    .single();

  if (record?.auth_user_id === ctx.userId) {
    return { error: "You cannot remove yourself as admin." };
  }

  const { error: dbError } = await admin
    .from("admin_users")
    .delete()
    .eq("id", adminId);

  if (dbError) {
    return { error: dbError.message };
  }

  return { success: true };
}
