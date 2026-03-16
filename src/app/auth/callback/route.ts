import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Behind a reverse proxy, request.url has the internal origin (e.g. localhost:3001).
  // Use forwarded headers to reconstruct the public-facing origin.
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);

      // Set a short-lived cookie so the reset-password page knows
      // this session came from a recovery email, not a normal login.
      if (next === "/reset-password") {
        response.cookies.set("password_recovery", "1", {
          maxAge: 300, // 5 minutes
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/reset-password",
        });
      }

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth`);
}
