import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "operator" | null;

export interface UserContext {
  role: UserRole;
  userId: string;
  email: string;
  operatorId?: string;
}

export async function getUserContext(): Promise<UserContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Check if admin
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (admin) {
    return {
      role: "admin",
      userId: user.id,
      email: user.email!,
    };
  }

  // Check if operator
  const { data: operator } = await supabase
    .from("operators")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (operator) {
    return {
      role: "operator",
      userId: user.id,
      email: user.email!,
      operatorId: operator.id,
    };
  }

  return {
    role: null,
    userId: user.id,
    email: user.email!,
  };
}
