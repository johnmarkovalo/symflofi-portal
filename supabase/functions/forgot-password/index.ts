import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("OTP_FROM_EMAIL") || "noreply@symflofi.cloud";
const TOKEN_EXPIRY_MINUTES = 15;

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const masked = local.length <= 2
    ? local[0] + "***"
    : local[0] + "***" + local[local.length - 1];
  return `${masked}@${domain}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendResetEmail(
  to: string,
  resetLink: string,
  machineName: string,
): Promise<void> {
  const safeName = escapeHtml(machineName);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: `[${machineName}] Password Reset Request`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="https://symflofi.cloud/logo-icon.png" alt="SymfloFi" width="48" height="48" style="border-radius: 12px; display: block;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.05)); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 40px 32px;">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #f0f0f5; letter-spacing: -0.025em;">
                      Password Reset
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 15px; color: #8b8b9e; line-height: 1.6;">
                      You requested a password reset for your <strong style="color: #f0f0f5;">${safeName}</strong> admin portal.
                      Click the button below to set a new password:
                    </p>
                  </td>
                </tr>

                <!-- Button -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 12px; letter-spacing: -0.01em;">
                      Reset Password
                    </a>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom: 24px;">
                    <div style="height: 1px; background: rgba(255, 255, 255, 0.06);"></div>
                  </td>
                </tr>

                <!-- Expiry & fallback -->
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 13px; color: #5c5c70; line-height: 1.6;">
                      This link expires in ${TOKEN_EXPIRY_MINUTES} minutes. If you didn't request this, you can safely ignore this email.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #6366f1; word-break: break-all; line-height: 1.5;">
                      ${resetLink}
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0; font-size: 12px; color: #3c3c4e; line-height: 1.5;">
                This email was sent from
                <a href="https://symflofi.cloud" style="color: #6366f1; text-decoration: none;">symflofi.cloud</a>.
                <br />If you didn't request a password reset, no action is needed.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to send email. Please try again later.`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const { machine_uuid, license_key, reset_base_url, machine_name } =
      await req.json();

    if (!machine_uuid || !license_key) {
      return new Response(
        JSON.stringify({ ok: false, error: "machine_uuid and license_key are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!reset_base_url) {
      return new Response(
        JSON.stringify({ ok: false, error: "reset_base_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!RESEND_API_KEY) {
      console.error("forgot-password: RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ ok: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Generic error message for all lookup failures to prevent enumeration
    const genericError = "Unable to process reset request. Ensure your device has a valid license linked to a SymfloFi Cloud account.";

    // Verify the machine exists and matches the license key
    const { data: machine, error: machineError } = await supabase
      .from("machines")
      .select("id, machine_uuid")
      .eq("license_key", license_key)
      .eq("machine_uuid", machine_uuid)
      .single();

    if (machineError || !machine) {
      return new Response(
        JSON.stringify({ ok: false, error: genericError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Look up the license to find the operator
    const { data: license, error: licenseError } = await supabase
      .from("license_keys")
      .select("operator_id")
      .eq("key", license_key)
      .single();

    if (licenseError || !license?.operator_id) {
      return new Response(
        JSON.stringify({ ok: false, error: genericError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Look up the operator's email
    const { data: operator, error: opError } = await supabase
      .from("operators")
      .select("email")
      .eq("id", license.operator_id)
      .single();

    if (opError || !operator?.email) {
      return new Response(
        JSON.stringify({ ok: false, error: genericError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate token and bcrypt hash
    const token = generateToken();
    const tokenHash = await bcrypt.hash(token);
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000,
    ).toISOString();

    // Build reset link
    const resetLink = `${reset_base_url}?token=${token}`;

    // Send the email
    const deviceName = machine_name || "SymfloFi";
    await sendResetEmail(operator.email, resetLink, deviceName);

    console.log(`forgot-password: reset email sent for machine ${machine_uuid} to ${maskEmail(operator.email)}`);

    // Return the hashed token and expiry for the device to store
    return new Response(
      JSON.stringify({
        ok: true,
        email_hint: maskEmail(operator.email),
        token_hash: tokenHash,
        expires_at: expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("forgot-password error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
