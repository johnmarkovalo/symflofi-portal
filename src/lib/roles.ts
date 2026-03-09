import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "operator" | null;

export interface UserContext {
  role: UserRole;
  userId: string;
  email: string;
  operatorId?: string;
  operatorCode?: string;
  isDistributor?: boolean;
}

export async function getUserContext(): Promise<UserContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Check if admin using the is_admin() DB function (bypasses RLS via SECURITY DEFINER)
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (isAdmin === true) {
    return {
      role: "admin",
      userId: user.id,
      email: user.email!,
    };
  }

  // Check if operator (includes distributors — they're operators with a flag)
  const { data: operators } = await supabase
    .from("operators")
    .select("id, is_distributor, operator_code")
    .eq("auth_user_id", user.id)
    .limit(1);

  if (operators && operators.length > 0) {
    return {
      role: "operator",
      userId: user.id,
      email: user.email!,
      operatorId: operators[0].id,
      operatorCode: operators[0].operator_code ?? undefined,
      isDistributor: operators[0].is_distributor ?? false,
    };
  }

  return {
    role: null,
    userId: user.id,
    email: user.email!,
  };
}
