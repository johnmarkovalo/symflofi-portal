"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ToastProvider, useToast } from "@/components/toast";

export default function RegisterPage() {
  return (
    <ToastProvider>
      <RegisterForm />
    </ToastProvider>
  );
}

function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!agreed) {
      setError("You must agree to the terms and conditions");
      return;
    }

    setLoading(true);

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (authError) {
      toast(authError.message, "error");
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Failed to create account");
      setLoading(false);
      return;
    }

    // 2. Create operator record linked to auth user
    const { error: opError } = await supabase.from("operators").insert({
      auth_user_id: authData.user.id,
      email,
      name,
      plan: "trial",
    });

    if (opError) {
      setError(opError.message);
      setLoading(false);
      return;
    }

    // Check if email confirmation is required
    if (authData.user.identities?.length === 0) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    // If auto-confirmed, redirect to portal
    if (authData.session) {
      toast("Account created successfully");
      router.push("/licenses");
      router.refresh();
    } else {
      toast("Check your email to confirm your account", "info");
      setSuccess(true);
      setLoading(false);
    }
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
            <p className="text-sm text-muted-foreground mt-1">Start managing your SymfloFi devices</p>
          </div>

          {success ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to <span className="text-foreground font-medium">{email}</span>. Click the link to activate your account.
              </p>
              <Link
                href="/signin"
                className="inline-block text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  placeholder="Juan Dela Cruz"
                />
              </div>

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

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Password
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
                  Confirm Password
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

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary/50 accent-primary"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <span className="text-foreground hover:text-primary cursor-pointer">Terms of Service</span>
                  {" "}and{" "}
                  <span className="text-foreground hover:text-primary cursor-pointer">Privacy Policy</span>
                </span>
              </label>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/25"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
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
