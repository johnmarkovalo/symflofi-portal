import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

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
