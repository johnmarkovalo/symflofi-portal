import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VPS_API_URL = Deno.env.get("VPS_API_URL") || "http://api.symflofi.cloud";
const VPS_API_KEY = Deno.env.get("VPS_API_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { machine_uuid, license_key, wg_public_key, health } = await req.json();

    if (!machine_uuid || !license_key) {
      return new Response(
        JSON.stringify({ ok: false, error: "machine_uuid and license_key are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: machine, error } = await supabase
      .from("machines")
      .select("id, machine_uuid, wg_public_key, wg_ip")
      .eq("license_key", license_key)
      .eq("machine_uuid", machine_uuid)
      .single();

    if (error || !machine) {
      return new Response(
        JSON.stringify({ ok: false, error: "unknown machine" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update last seen
    const updateData: Record<string, unknown> = {
      last_seen_at: new Date().toISOString(),
      is_online: true,
    };

    // Handle WireGuard peer provisioning
    let wgIp = machine.wg_ip;
    if (wg_public_key && VPS_API_KEY) {
      const keyChanged = wg_public_key !== machine.wg_public_key;
      const notProvisioned = !machine.wg_ip;

      if (keyChanged || notProvisioned) {
        // Provision peer on VPS
        try {
          const vpsResp = await fetch(`${VPS_API_URL}/api/peers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${VPS_API_KEY}`,
            },
            body: JSON.stringify({
              machineUuid: machine_uuid,
              publicKey: wg_public_key,
            }),
          });

          if (vpsResp.ok) {
            const vpsData = await vpsResp.json();
            wgIp = vpsData.ip;
            updateData.wg_public_key = wg_public_key;
            updateData.wg_ip = wgIp;
            console.log(`WG peer provisioned: ${machine_uuid} → ${wgIp}`);
          } else {
            const errText = await vpsResp.text();
            console.error(`VPS provisioning failed: ${errText}`);
          }
        } catch (err) {
          console.error(`VPS provisioning error: ${err.message}`);
        }
      }
    }

    await supabase
      .from("machines")
      .update(updateData)
      .eq("id", machine.id);

    // Store health snapshot if provided
    if (health && typeof health === "object") {
      await supabase.from("machine_health").insert({
        machine_id: machine.id,
        cpu_percent: null, // device doesn't report CPU load %
        ram_percent: health.mem_used_percent ?? null,
        disk_percent: health.disk_used_percent ?? null,
        temperature: health.cpu_temp ?? null,
        uptime_secs: health.uptime_secs ? Math.floor(health.uptime_secs) : null,
        connected_clients: health.connected_clients ?? null,
      });

      // Clean up old snapshots — keep only the latest 100 per machine
      await supabase.rpc("cleanup_old_health", { p_machine_id: machine.id, p_keep: 100 }).catch(() => {
        // RPC may not exist yet — non-fatal
      });
    }

    return new Response(
      JSON.stringify({ ok: true, wg_ip: wgIp || null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "internal error: " + err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
