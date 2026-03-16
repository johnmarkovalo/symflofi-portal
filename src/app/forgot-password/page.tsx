"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ToastProvider, useToast } from "@/components/toast";

export default function ForgotPasswordPage() {
  return (
    <ToastProvider>
      <ForgotPasswordForm />
    </ToastProvider>
  );
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      toast("Something went wrong. Please try again.", "error");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-30"
          style={{ background: "linear-gradient(to bottom right, oklch(0.45 0.2 270), oklch(0.3 0.15 300))" }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: "linear-gradient(to top left, oklch(0.4 0.18 280), oklch(0.25 0.12 250))" }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Forgot Password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {sent ? "Check your inbox" : "Enter your email to reset your password"}
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                If an account exists for <span className="text-foreground font-medium">{email}</span>, you&apos;ll receive a password reset link shortly.
              </p>
              <Link
                href="/signin"
                className="inline-block text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/25"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link href="/signin" className="text-primary hover:text-primary/80 font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          SymfloFi Cloud v0.1.0
        </p>
      </div>
    </div>
  );
}
