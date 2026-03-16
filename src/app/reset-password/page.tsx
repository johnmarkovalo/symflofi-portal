"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ToastProvider, useToast } from "@/components/toast";

export default function ResetPasswordPage() {
  return (
    <ToastProvider>
      <ResetPasswordForm />
    </ToastProvider>
  );
}

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"checking" | "verified" | "invalid">("checking");
  const [error, setError] = useState("");
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    // Check if the user has a valid session (established by the auth callback
    // after exchanging the recovery code from the email link).
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      setStatus(user ? "verified" : "invalid");
    });

    return () => { cancelled = true; };
  }, [supabase.auth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      toast("Failed to reset password. Please try again.", "error");
      setError("Failed to reset password. Please try again.");
      setLoading(false);
      return;
    }

    toast("Password reset successfully");
    router.push("/dashboard");
    router.refresh();
  }

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Verifying...</div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-30"
            style={{ background: "linear-gradient(to bottom right, oklch(0.45 0.2 270), oklch(0.3 0.15 300))" }} />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ background: "linear-gradient(to top left, oklch(0.4 0.18 280), oklch(0.25 0.12 250))" }} />
        </div>

        <div className="w-full max-w-sm relative z-10">
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border shadow-2xl p-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Invalid or expired reset link.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
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
            <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
            <p className="text-sm text-muted-foreground mt-1">Choose a new password for your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1.5">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                placeholder="Min. 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-muted-foreground mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                placeholder="Repeat your password"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/25"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          SymfloFi Cloud v0.1.0
        </p>
      </div>
    </div>
  );
}
