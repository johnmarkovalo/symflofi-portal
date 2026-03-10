"use client";

import { useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

/**
 * Public landing page for payment provider redirects.
 * Lives outside (portal) so it doesn't require auth.
 * E-wallet flows (GCash, Maya) may redirect back in a webview
 * that doesn't have the user's session cookies.
 *
 * This page simply redirects into the authenticated checkout page
 * where the real status polling happens.
 */
export default function PaymentReturnPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get("status") ?? "success";

  useEffect(() => {
    // Redirect to the real checkout page inside the portal
    router.replace(`/store/checkout/${orderId}?status=${status}`);
  }, [orderId, status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
          <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">Confirming your payment...</p>
      </div>
    </div>
  );
}
