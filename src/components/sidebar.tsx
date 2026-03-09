"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/roles";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
  requireDistributor?: boolean;
  badge?: number;
};

type NavSection = {
  section: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    section: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4", roles: ["admin", "operator"] },
      { label: "Operators", href: "/operators", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", roles: ["admin"] },
      { label: "Machines", href: "/machines", icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z", roles: ["admin", "operator"] },
    ],
  },
  {
    section: "Licensing",
    items: [
      { label: "Licenses", href: "/licenses", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", roles: ["admin", "operator"] },
      { label: "License Requests", href: "/license-requests", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", roles: ["admin", "operator"], requireDistributor: true },
      { label: "Transfer License", href: "/licenses/transfer", icon: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5", roles: ["operator"], requireDistributor: true },
    ],
  },
  {
    section: "Profile",
    items: [
      { label: "Distributor Profile", href: "/my-profile", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z", roles: ["operator"], requireDistributor: true },
    ],
  },
  {
    section: "Settings",
    items: [
      { label: "License Tiers", href: "/license-tiers", icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z", roles: ["admin"] },
      { label: "Distributor Tiers", href: "/distributor-tiers", icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z", roles: ["admin"] },
    ],
  },
];

export default function Sidebar({
  role,
  email,
  pendingRequests,
  isDistributor,
}: {
  role: UserRole;
  email: string;
  pendingRequests?: number;
  isDistributor?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  }

  const sidebarContent = (
    <>
      <div className="absolute top-0 left-0 w-full h-32 glow-indigo pointer-events-none" />

      <div className="px-6 py-5 border-b border-border relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo-icon.png" alt="SymfloFi" width={32} height={32} className="rounded-lg" />
          <div>
            <h1 className="text-sm font-bold text-foreground">SymfloFi</h1>
            <p className="text-[11px] text-muted-foreground">Cloud Portal</p>
          </div>
        </div>
        {/* Close button - mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-5 relative z-10 overflow-y-auto">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (!role || !item.roles.includes(role)) return false;
            // Items requiring distributor: visible to admin always, to operators only if isDistributor
            if (item.requireDistributor) {
              if (role === "admin") return true;
              return !!isDistributor;
            }
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.section}>
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.section}
              </p>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const active = pathname.startsWith(item.href);
                  const badge = item.href === "/license-requests" && role === "admin" && pendingRequests ? pendingRequests : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                        active
                          ? "bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/10"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                      }`}
                    >
                      <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                      <span className="flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border relative z-10 space-y-2">
        <div className="px-3 py-1">
          <p className="text-xs text-muted-foreground truncate">{email}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] text-muted-foreground/60 capitalize">{role}</p>
            {isDistributor && (
              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-md font-medium">
                distributor
              </span>
            )}
          </div>
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
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar (drawer) */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card/95 backdrop-blur-xl border-r border-border flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-card/50 backdrop-blur-xl border-r border-border flex-col min-h-screen relative">
        {sidebarContent}
      </aside>
    </>
  );
}
