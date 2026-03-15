import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VPS_API_URL = Deno.env.get("VPS_API_URL") || "http://api.symflofi.cloud";
const VPS_API_KEY = Deno.env.get("VPS_API_KEY") || "";
const VPS_WG_ENDPOINT = Deno.env.get("VPS_WG_ENDPOINT") || "187.77.143.241:51820";
const VPS_WG_PUBLIC_KEY = Deno.env.get("VPS_WG_PUBLIC_KEY") || "2H2Mi6/BNNnAM+S8VcJMHNrBIWQACM2spEoURv8kJTw=";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const {
      machine_uuid,
      license_key,
      app_version,
      hardware,
      os_version,
      ip_address,
      wg_public_key,
      esp32_device_id,
      sessions,
      daily_revenue,
    } = await req.json();

    if (!machine_uuid || !license_key) {
      return new Response(
        JSON.stringify({ ok: false, error: "machine_uuid and license_key are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Look up machine by license key + uuid
    const { data: machine, error } = await supabase
      .from("machines")
      .select("id, machine_uuid, wg_public_key, wg_ip, license_tier")
      .eq("license_key", license_key)
      .eq("machine_uuid", machine_uuid)
      .single();

    if (error || !machine) {
      return new Response(
        JSON.stringify({ ok: false, error: "unknown machine" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update last seen + device info
    const updateData: Record<string, unknown> = {
      last_seen_at: new Date().toISOString(),
      is_online: true,
    };
    if (app_version) updateData.app_version = app_version;
    if (hardware) updateData.hardware = hardware;
    if (os_version) updateData.os_version = os_version;
    if (ip_address) updateData.ip_address = ip_address;
    if (esp32_device_id) updateData.esp32_device_id = esp32_device_id;

    // WireGuard remote access (Pro/Business only)
    let wgIp = machine.wg_ip;
    const tier = machine.license_tier || "";
    const hasRemoteAccess = tier === "playtab_pro" || tier === "playtab_business";

    if (wg_public_key && VPS_API_KEY && hasRemoteAccess) {
      const keyChanged = wg_public_key !== machine.wg_public_key;
      const notProvisioned = !machine.wg_ip;

      if (keyChanged || notProvisioned) {
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
            console.log(`PlayTab WG peer provisioned: ${machine_uuid} → ${wgIp}`);
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

    // Sync sessions (Pro/Business only)
    if (hasRemoteAccess && Array.isArray(sessions) && sessions.length > 0) {
      for (const s of sessions) {
        await supabase.from("playtab_sessions").upsert({
          id: s.id,
          machine_id: machine.id,
          coins_inserted: s.coins_inserted,
          duration_seconds: s.duration_seconds,
          earnings: s.earnings,
          started_at: s.started_at,
          ended_at: s.ended_at,
        }, { onConflict: "id" }).catch(() => {});
      }
    }

    // Sync daily revenue (Pro/Business only)
    if (hasRemoteAccess && Array.isArray(daily_revenue) && daily_revenue.length > 0) {
      for (const d of daily_revenue) {
        await supabase.from("playtab_daily_revenue").upsert({
          machine_id: machine.id,
          date: d.date,
          session_count: d.session_count,
          total_coins: d.total_coins,
          total_earnings: d.total_earnings,
          total_duration_seconds: d.total_duration_seconds,
        }, { onConflict: "machine_id,date" }).catch(() => {});
      }
    }

    // Build response
    const responseBody: Record<string, unknown> = { ok: true, wg_ip: wgIp || null };
    if (wgIp && hasRemoteAccess) {
      responseBody.server_endpoint = VPS_WG_ENDPOINT;
      responseBody.server_public_key = VPS_WG_PUBLIC_KEY;
    }

    return new Response(
      JSON.stringify(responseBody),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "internal error: " + err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
