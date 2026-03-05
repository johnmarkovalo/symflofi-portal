"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/roles";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
};

const nav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4", roles: ["admin"] },
  { label: "Operators", href: "/operators", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", roles: ["admin"] },
  { label: "Licenses", href: "/licenses", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", roles: ["admin", "operator"] },
  { label: "Machines", href: "/machines", icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z", roles: ["admin", "operator"] },
];

export default function Sidebar({ role, email }: { role: UserRole; email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const visibleNav = nav.filter((item) => role && item.roles.includes(role));

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  }

  return (
    <aside className="w-64 bg-card/50 backdrop-blur-xl border-r border-border flex flex-col min-h-screen relative">
      {/* Subtle glow */}
      <div className="absolute top-0 left-0 w-full h-32 glow-indigo pointer-events-none" />

      <div className="px-6 py-5 border-b border-border relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">SymfloFi</h1>
            <p className="text-[11px] text-muted-foreground">Cloud Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 relative z-10">
        {visibleNav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/10"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
              }`}
            >
              <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border relative z-10 space-y-2">
        <div className="px-3 py-1">
          <p className="text-xs text-muted-foreground truncate">{email}</p>
          <p className="text-[11px] text-muted-foreground/60 capitalize">{role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all w-full border border-transparent"
        >
          <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3h-9m9 0l-3-3m3 3l-3 3" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
