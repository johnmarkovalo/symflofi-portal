import Link from "next/link";
import PublicNav from "@/components/public-nav";
import { createClient } from "@/lib/supabase/server";
import DistributorDirectory from "./distributor-directory";

type Distributor = {
  id: string;
  business_name: string | null;
  name: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  contact_number: string | null;
  facebook_url: string | null;
  distributor_tier: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default async function DistributorDirectoryPage() {
  const supabase = await createClient();

  const { data: distributors } = await supabase
    .from("operators")
    .select("id, business_name, name, region, province, city, contact_number, facebook_url, distributor_tier, latitude, longitude")
    .eq("is_distributor", true)
    .eq("is_listed", true)
    .order("region", { ascending: true });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-30%] right-[-15%] w-[800px] h-[800px] rounded-full blur-3xl animate-pulse-glow"
          style={{ background: "linear-gradient(to bottom left, oklch(0.5 0.22 270), oklch(0.3 0.15 300))" }}
        />
      </div>

      <PublicNav activePage="distributors" />

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-24 sm:pb-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Authorized Distributors</h1>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base">
            Find an authorized SymfloFi distributor near you. Purchase licenses, get support, and start your piso WiFi business.
          </p>
        </div>

        <DistributorDirectory distributors={(distributors ?? []) as Distributor[]} />

        {/* CTA */}
        <div className="mt-16 bg-card/60 backdrop-blur-sm border border-border rounded-2xl p-8 sm:p-10 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Want to become a distributor?</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6">
            Earn wholesale discounts, get bonus licenses, and grow your business by reselling SymfloFi licenses in your area.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
            >
              Sign Up as Operator
            </Link>
            <a
              href="https://www.facebook.com/symflofi"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-all"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} <a href="https://symflo.dev" className="hover:text-foreground transition-colors">SymfloFi</a>. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
