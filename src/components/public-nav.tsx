"use client";

import { useState } from "react";
import Link from "next/link";

export default function PublicNav({ activePage }: { activePage?: "downloads" | "distributors" }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="relative z-20 border-b border-border/50 backdrop-blur-xl bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
            </svg>
          </div>
          <span className="text-sm font-bold">SymfloFi</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="/#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="/#hardware" className="hover:text-foreground transition-colors">Hardware</Link>
          <Link href="/#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <Link href="/downloads" className={activePage === "downloads" ? "text-foreground font-medium" : "hover:text-foreground transition-colors"}>Downloads</Link>
          <Link href="/distributors" className={activePage === "distributors" ? "text-foreground font-medium" : "hover:text-foreground transition-colors"}>Distributors</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/signin" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            Sign up
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-1">
            <Link href="/#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Features</Link>
            <Link href="/#hardware" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Hardware</Link>
            <Link href="/#pricing" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Pricing</Link>
            <Link href="/downloads" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2.5 rounded-lg text-sm hover:bg-muted transition-colors ${activePage === "downloads" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>Downloads</Link>
            <Link href="/distributors" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2.5 rounded-lg text-sm hover:bg-muted transition-colors ${activePage === "distributors" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>Distributors</Link>
            <Link href="/signin" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors sm:hidden">Log in</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
