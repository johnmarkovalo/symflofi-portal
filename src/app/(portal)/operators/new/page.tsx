"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { createOperator } from "./actions";

type DistributorTier = {
  id: string;
  name: string;
  label: string;
  discount_pct: number;
};

type LicensePrice = {
  name: string;
  label: string;
  price_cents: number;
};

export default function NewOperatorPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"operator" | "distributor">("operator");
  const [tier, setTier] = useState("");
  const [tiers, setTiers] = useState<DistributorTier[]>([]);
  const [licensePrices, setLicensePrices] = useState<LicensePrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("distributor_tiers")
      .select("id, name, label, discount_pct")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setTiers(data);
          setTier(data[0].name);
        }
      });
    supabase
      .from("license_tiers")
      .select("name, label, price_cents")
      .gt("price_cents", 0)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setLicensePrices(data);
      });
  }, []);

  const selectedTier = tiers.find((t) => t.name === tier);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const isDistributor = role === "distributor";

      const result = await createOperator({
        name,
        email,
        password,
        is_distributor: isDistributor,
        distributor_tier: isDistributor ? tier : null,
        distributor_discount_pct: isDistributor ? (selectedTier?.discount_pct ?? 0) : 0,
      });

      if (result.error) {
        toast(result.error, "error");
        setError(result.error);
        return;
      }

      toast(`Operator ${name} created`);
      router.push("/operators");
      router.refresh();
    } catch {
      setError("Something went wrong. Check server logs or ensure the service role key is configured.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Add Operator</h1>
        <p className="text-sm text-muted-foreground mt-1">Create a new operator account</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 sm:p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            placeholder="Operator name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            placeholder="operator@example.com"
          />
        </div>

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
          <p className="text-xs text-muted-foreground mt-1">Give this to the operator so they can sign in</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Role</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole("operator")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium border transition-all ${
                role === "operator"
                  ? "bg-zinc-500/10 text-zinc-300 border-zinc-500/30 ring-2 ring-zinc-500/30"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              }`}
            >
              Operator
            </button>
            <button
              type="button"
              onClick={() => setRole("distributor")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium border transition-all ${
                role === "distributor"
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 ring-2 ring-cyan-500/30"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              }`}
            >
              Distributor
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {role === "distributor"
              ? "Can request and transfer licenses to other operators"
              : "Standard operator account"}
          </p>
        </div>

        {role === "distributor" && tiers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Distributor Tier</label>
            <div className="grid grid-cols-3 gap-2">
              {tiers.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setTier(t.name)}
                  className={`rounded-xl px-3 py-3 text-sm font-medium border transition-all text-center ${
                    tier === t.name
                      ? "bg-primary/10 text-primary border-primary/30 ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  }`}
                >
                  <span className="block">{t.label}</span>
                  <span className="block text-[11px] mt-0.5 opacity-70">{t.discount_pct}% off</span>
                </button>
              ))}
            </div>
            {selectedTier && licensePrices.length > 0 && (
              <div className="mt-3 bg-muted/50 rounded-xl border border-border px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Wholesale pricing preview</p>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {licensePrices.map((lp) => (
                    <div key={lp.name} className="flex justify-between">
                      <span className="text-muted-foreground">{lp.label} (₱{(lp.price_cents / 100).toLocaleString()})</span>
                      <span className="text-foreground font-medium">₱{(Math.round(lp.price_cents * (1 - selectedTier.discount_pct / 100)) / 100).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            {loading ? "Creating..." : "Create Operator"}
          </button>
        </div>
      </form>
    </div>
  );
}
