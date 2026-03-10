"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { addAdmin } from "../actions";

export default function NewAdminPage() {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await addAdmin({
        mode,
        email,
        name: mode === "new" ? name : undefined,
        password: mode === "new" ? password : undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast(`Admin ${email} added successfully`);
      router.replace("/admin-users");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Add Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Create a new admin or promote an existing user</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 sm:p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Mode</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium border transition-all ${
                mode === "new"
                  ? "bg-primary/10 text-primary border-primary/30 ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              }`}
            >
              Create new account
            </button>
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium border transition-all ${
                mode === "existing"
                  ? "bg-primary/10 text-primary border-primary/30 ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              }`}
            >
              Promote existing user
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {mode === "new"
              ? "Creates a new account with admin access (not an operator)"
              : "Grants admin access to a user who already has an account"}
          </p>
        </div>

        {mode === "new" && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              placeholder="Admin name"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            placeholder={mode === "new" ? "admin@example.com" : "existing-user@example.com"}
          />
        </div>

        {mode === "new" && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              placeholder="Temporary password (min 6 characters)"
            />
            <p className="text-xs text-muted-foreground mt-1">Give this to the admin so they can sign in</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-muted text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-muted/80 border border-border transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
          >
            {loading ? "Adding..." : mode === "new" ? "Create Admin" : "Promote to Admin"}
          </button>
        </div>
      </form>
    </div>
  );
}
