import { redirect } from "next/navigation";
import Sidebar from "@/components/sidebar";
import { getUserContext } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getUserContext();

  if (!ctx) {
    redirect("/signin");
  }

  if (!ctx.role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-8 max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Your account ({ctx.email}) is not linked to an admin or operator profile. Contact support.
          </p>
          <form action="/auth/signout" method="post">
            <a href="/signin" className="text-sm text-primary hover:text-primary/80">Sign out</a>
          </form>
        </div>
      </div>
    );
  }

  let pendingRequests = 0;
  if (ctx.role === "admin") {
    const supabase = await createClient();
    const { count } = await supabase
      .from("license_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    pendingRequests = count ?? 0;
  }

  return (
    <div className="flex min-h-screen bg-background relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full blur-3xl opacity-[0.07]"
          style={{ background: "linear-gradient(to bottom left, oklch(0.5 0.2 270), oklch(0.3 0.15 300))" }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-3xl opacity-[0.05]"
          style={{ background: "linear-gradient(to top right, oklch(0.45 0.18 250), oklch(0.3 0.12 280))" }} />
      </div>

      <Sidebar
        role={ctx.role}
        email={ctx.email}
        pendingRequests={pendingRequests}
        isDistributor={ctx.isDistributor}
      />
      <main className="flex-1 p-4 pt-16 md:pt-8 md:p-8 relative z-10">{children}</main>
    </div>
  );
}
