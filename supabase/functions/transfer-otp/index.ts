import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("OTP_FROM_EMAIL") || "noreply@symflofi.cloud";

function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

async function sendOtpEmail(
  to: string,
  otp: string,
  licenseCount: number,
  recipientName: string,
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: "SymfloFi — License Transfer Verification Code",
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>License Transfer Verification</title>
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
                      License Transfer Verification
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 15px; color: #8b8b9e; line-height: 1.6;">
                      You requested to transfer <strong style="color: #f0f0f5;">${licenseCount} license${licenseCount !== 1 ? "s" : ""}</strong>
                      to <strong style="color: #f0f0f5;">${recipientName}</strong>. Use the code below to confirm:
                    </p>
                  </td>
                </tr>

                <!-- OTP Code -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; text-align: center;">
                      <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #f0f0f5;">${otp}</span>
                    </div>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom: 24px;">
                    <div style="height: 1px; background: rgba(255, 255, 255, 0.06);"></div>
                  </td>
                </tr>

                <!-- Expiry note -->
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 13px; color: #5c5c70; line-height: 1.6;">
                      This code expires in 10 minutes. If you did not request this transfer, you can safely ignore this email.
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
                <br />If you didn't initiate this transfer, no action is needed.
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
    throw new Error(`Resend API error: ${res.status} ${body}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authenticate the caller
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { action, ...payload } = await req.json();

    // ── SEND OTP ──────────────────────────────────────────────────────────
    if (action === "send") {
      const { license_ids, recipient_identifier } = payload;

      if (!license_ids?.length || !recipient_identifier) {
        return new Response(
          JSON.stringify({ error: "license_ids and recipient_identifier are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Resolve current operator
      const { data: fromOp } = await supabaseAdmin
        .from("operators")
        .select("id, email, name")
        .eq("auth_user_id", user.id)
        .single();

      if (!fromOp) {
        return new Response(
          JSON.stringify({ error: "Operator not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Resolve recipient
      const trimmed = recipient_identifier.trim();
      let recipientQuery = supabaseAdmin
        .from("operators")
        .select("id, name, email");

      if (trimmed.includes("@")) {
        recipientQuery = recipientQuery.eq("email", trimmed.toLowerCase());
      } else if (trimmed.toUpperCase().startsWith("SYMF-")) {
        recipientQuery = recipientQuery.eq("operator_code", trimmed.toUpperCase());
      } else {
        recipientQuery = recipientQuery.eq("id", trimmed);
      }

      const { data: toOp } = await recipientQuery.single();

      if (!toOp) {
        return new Response(
          JSON.stringify({ error: `No operator found with: ${recipient_identifier}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (toOp.id === fromOp.id) {
        return new Response(
          JSON.stringify({ error: "Cannot transfer to yourself" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Validate all licenses are transferable
      const { data: validLicenses } = await supabaseAdmin
        .from("license_keys")
        .select("id, key, is_activated, operator_id")
        .in("id", license_ids);

      const invalid = validLicenses?.find(
        (l: { is_activated: boolean; operator_id: string }) =>
          l.is_activated || l.operator_id !== fromOp.id,
      );
      if (invalid) {
        return new Response(
          JSON.stringify({ error: `License ${(invalid as { key: string }).key} is not transferable` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Clean up expired OTPs
      await supabaseAdmin.rpc("cleanup_expired_otps");

      // Generate and store OTP
      const otp = generateOtp();
      const { data: otpRecord, error: insertError } = await supabaseAdmin
        .from("transfer_otps")
        .insert({
          license_ids,
          from_operator_id: fromOp.id,
          to_operator_id: toOp.id,
          otp_code: otp,
        })
        .select("id")
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Failed to create OTP" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Send email to the initiating operator
      await sendOtpEmail(
        fromOp.email,
        otp,
        license_ids.length,
        toOp.name || toOp.email,
      );

      return new Response(
        JSON.stringify({
          otp_id: otpRecord.id,
          recipient: { name: toOp.name, email: toOp.email },
          message: `Verification code sent to ${fromOp.email}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── VERIFY OTP & EXECUTE TRANSFER ─────────────────────────────────────
    if (action === "verify") {
      const { otp_id, otp_code } = payload;

      if (!otp_id || !otp_code) {
        return new Response(
          JSON.stringify({ error: "otp_id and otp_code are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Resolve current operator
      const { data: fromOp } = await supabaseAdmin
        .from("operators")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (!fromOp) {
        return new Response(
          JSON.stringify({ error: "Operator not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Fetch the OTP record
      const { data: otpRecord } = await supabaseAdmin
        .from("transfer_otps")
        .select("*")
        .eq("id", otp_id)
        .eq("from_operator_id", fromOp.id)
        .eq("verified", false)
        .single();

      if (!otpRecord) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired verification request" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (new Date(otpRecord.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Verification code has expired. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (otpRecord.otp_code !== otp_code) {
        return new Response(
          JSON.stringify({ error: "Incorrect verification code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Mark OTP as verified
      await supabaseAdmin
        .from("transfer_otps")
        .update({ verified: true })
        .eq("id", otp_id);

      // Execute the transfer
      const { error: transferError } = await supabaseAdmin
        .from("license_keys")
        .update({ operator_id: otpRecord.to_operator_id })
        .in("id", otpRecord.license_ids);

      if (transferError) {
        return new Response(
          JSON.stringify({ error: "Transfer failed: " + transferError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Get recipient info for audit log
      const { data: toOp } = await supabaseAdmin
        .from("operators")
        .select("id, name, email")
        .eq("id", otpRecord.to_operator_id)
        .single();

      // Get license keys for audit
      const { data: transferredLicenses } = await supabaseAdmin
        .from("license_keys")
        .select("id, key")
        .in("id", otpRecord.license_ids);

      // Write audit log
      if (transferredLicenses?.length) {
        await supabaseAdmin.from("license_audit_log").insert(
          transferredLicenses.map((l: { id: string; key: string }) => ({
            license_key_id: l.id,
            license_key: l.key,
            event: "transferred",
            from_operator_id: fromOp.id,
            to_operator_id: otpRecord.to_operator_id,
            actor_id: fromOp.id,
            actor_role: "operator",
            note: `Transferred to ${toOp?.name || toOp?.email} (OTP verified)`,
          })),
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          transferred: otpRecord.license_ids.length,
          recipient: toOp ? { name: toOp.name, email: toOp.email } : null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "send" or "verify".' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
