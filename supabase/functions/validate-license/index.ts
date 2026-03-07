import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { machine_uuid, license_key, app_version, hardware, os_version } =
      await req.json();

    if (!license_key || !machine_uuid) {
      return Response.json(
        { valid: false, error: "Missing license_key or machine_uuid" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.rpc("validate_license", {
      p_license_key: license_key,
      p_machine_uuid: machine_uuid,
      p_app_version: app_version || null,
      p_hardware: hardware || null,
      p_os_version: os_version || null,
    });

    if (error) {
      console.error("validate_license RPC error:", error);
      return Response.json(
        { valid: false, error: `Failed to activate license: ${error.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    return Response.json(data, { headers: corsHeaders });
  } catch (err) {
    console.error("Edge function error:", err);
    return Response.json(
      { valid: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
});
