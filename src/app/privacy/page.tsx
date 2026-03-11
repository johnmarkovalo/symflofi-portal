import { Metadata } from "next";
import Link from "next/link";
import PublicNav from "@/components/public-nav";

export const metadata: Metadata = {
  title: "Privacy Policy | SymfloFi Cloud",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: March 11, 2026
        </p>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p>We collect the following types of information:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong className="text-foreground">Account information:</strong> name, email address, and password when you register</li>
              <li><strong className="text-foreground">Device information:</strong> machine UUID, hardware model, firmware version, and IP address when your device connects to our services</li>
              <li><strong className="text-foreground">Payment information:</strong> order details and transaction references (payment card details are handled entirely by our payment provider and never stored on our servers)</li>
              <li><strong className="text-foreground">Usage data:</strong> firmware download activity, license activation events, and portal usage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Provide and maintain the SymfloFi Cloud service</li>
              <li>Validate license keys and manage device access</li>
              <li>Process payments and deliver license keys</li>
              <li>Monitor device health and connectivity</li>
              <li>Improve our services and user experience</li>
              <li>Communicate service updates and support responses</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Data Storage</h2>
            <p>
              Your data is stored securely using Supabase, a hosted PostgreSQL database platform with encryption at rest and in transit. Our infrastructure is hosted on cloud servers with industry-standard security practices. Access to production data is restricted to authorized personnel only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Third-Party Services</h2>
            <p>We use the following third-party services that may process your data:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong className="text-foreground">Supabase:</strong> authentication and database hosting</li>
              <li><strong className="text-foreground">Xendit:</strong> payment processing (handles all payment card data)</li>
              <li><strong className="text-foreground">Sentry:</strong> error monitoring and performance tracking (collects anonymized error data)</li>
            </ul>
            <p className="mt-2">
              Each third-party service operates under its own privacy policy. We recommend reviewing their policies for details on how they handle data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Cookies</h2>
            <p>
              We use essential cookies to maintain your authentication session. These cookies are required for the Service to function and cannot be disabled. We do not use advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. Device heartbeat and session data is retained for 90 days. Audit logs are retained for 1 year. If you delete your account, your personal data will be removed within 30 days, though anonymized usage data may be retained for analytics purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your data in a portable format</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, contact us at the email address below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your data, including encryption in transit (TLS), row-level security on database access, and role-based access controls. However, no method of electronic transmission or storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Contact</h2>
            <p>
              For privacy-related questions or requests, contact us at{" "}
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
