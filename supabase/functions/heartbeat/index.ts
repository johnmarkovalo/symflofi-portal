import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { machine_uuid, license_key } = await req.json();

    if (!machine_uuid || !license_key) {
      return new Response(
        JSON.stringify({ ok: false, error: "machine_uuid and license_key are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: machine, error } = await supabase
      .from("machines")
      .select("id, machine_uuid")
      .eq("license_key", license_key)
      .eq("machine_uuid", machine_uuid)
      .single();

    if (error || !machine) {
      return new Response(
        JSON.stringify({ ok: false, error: "unknown machine" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase
      .from("machines")
      .update({
        last_seen_at: new Date().toISOString(),
        is_online: true,
      })
      .eq("id", machine.id);

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "internal error: " + err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
