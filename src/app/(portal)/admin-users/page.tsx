import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserContext } from "@/lib/roles";
import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import { RemoveAdminButton } from "./remove-button";

export default async function AdminUsersPage() {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "admin") redirect("/licenses");

  // Use admin client to bypass RLS on admin_users table
  const admin = createAdminClient();

  const { data: adminRows } = await admin
    .from("admin_users")
    .select("id, auth_user_id, email, created_at")
    .order("created_at", { ascending: false });

  const admins = adminRows ?? [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Admin Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage portal administrators</p>
        </div>
        <Link
          href="/admin-users/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Admin
        </Link>
      </div>

      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Email</th>
              <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Added</th>
              <th className="text-right px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider md:px-5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                <td className="px-5 py-4 text-foreground">
                  {admin.email ? (
                    <span>{admin.email}</span>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground">{admin.auth_user_id}</span>
                  )}
                  {admin.auth_user_id === ctx.userId && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium border bg-primary/10 text-primary border-primary/20">
                      you
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  <LocalTime date={admin.created_at} dateOnly />
                </td>
                <td className="px-5 py-4 text-right">
                  {admin.auth_user_id !== ctx.userId && (
                    <RemoveAdminButton adminId={admin.id} />
                  )}
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-12 text-center text-muted-foreground">
                  No admin users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
