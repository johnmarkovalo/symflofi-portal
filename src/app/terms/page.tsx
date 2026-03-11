import { Metadata } from "next";
import Link from "next/link";
import PublicNav from "@/components/public-nav";

export const metadata: Metadata = {
  title: "Terms of Service | SymfloFi Cloud",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: March 11, 2026
        </p>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the SymfloFi Cloud platform (&ldquo;Service&rdquo;), operated by SymfloFi (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>
              SymfloFi Cloud is a management portal for the SymfloFi WiFi vending system. The Service provides license management, device monitoring, operator accounts, and related cloud functionality for Piso WiFi devices running ImmortalWrt firmware.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Account Registration</h2>
            <p>
              To use the Service, you must create an account with a valid email address. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. License Keys</h2>
            <p>
              License keys purchased through the Service grant you a limited, non-exclusive, non-transferable right to use the SymfloFi firmware features for the duration specified by your license tier. License keys are bound to specific machines and cannot be shared, resold, or redistributed without authorization.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Payments and Refunds</h2>
            <p>
              All payments are processed through our third-party payment provider. Prices are displayed in Philippine Pesos (PHP) unless otherwise stated. License key purchases are final and non-refundable once the key has been activated on a device. Unused and unactivated keys may be eligible for a refund within 7 days of purchase at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Distributor Program</h2>
            <p>
              Operators may qualify for distributor status based on license volume. Distributors receive wholesale discounts as defined by the current distributor tier structure. We reserve the right to modify discount rates, tier requirements, and promotion criteria at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Reverse engineer, decompile, or tamper with SymfloFi firmware or license validation</li>
              <li>Attempt to bypass license restrictions or device limits</li>
              <li>Use the Service for any unlawful purpose</li>
              <li>Share or resell license keys without authorization</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted access to the Service. We may perform maintenance, updates, or modifications that temporarily affect availability. We are not liable for any downtime or service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Termination</h2>
            <p>
              We may suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion. Upon termination, your right to use the Service ceases immediately. Active license keys on devices will continue to function until their expiry date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, SymfloFi shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of revenue, data, or profits, arising from your use of the Service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">11. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Changes will be posted on this page with an updated date. Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">12. Contact</h2>
            <p>
              If you have questions about these Terms, contact us at{" "}
              <a href="mailto:support@symflo.dev" className="text-primary hover:text-primary/80 transition-colors">
                support@symflo.dev
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50">
          <Link href="/" className="text-sm text-primary hover:text-primary/80 transition-colors">
            &larr; Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
