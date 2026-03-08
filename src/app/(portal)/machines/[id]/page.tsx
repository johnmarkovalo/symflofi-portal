import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";
import Link from "next/link";
import ActivityFeed from "@/components/activity-feed";

export const dynamic = "force-dynamic";

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    enterprise: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    pro: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    lite: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    demo: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${styles[tier] ?? styles.demo}`}>
      {tier}
    </span>
  );
}

function HealthBar({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value === null || value === undefined) return null;
  const pct = unit === "%" ? value : 0;
  const barColor = pct > 80 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{value}{unit}</span>
      </div>
      {unit === "%" && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

export default async function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) redirect("/signin");

  const supabase = await createClient();

  const { data: machine } = await supabase
    .from("machines")
    .select("*, operators(name, email)")
    .eq("id", id)
    .single();

  if (!machine) notFound();

  // Check operator can only see their own machines
  if (ctx.role === "operator" && machine.operator_id !== ctx.operatorId) {
    notFound();
  }

  const [healthRes, activitiesRes] = await Promise.all([
    supabase
      .from("machine_health")
      .select("*")
      .eq("machine_id", id)
      .order("recorded_at", { ascending: false })
      .limit(1),
    supabase
      .from("activity_log")
      .select("id, event_type, description, created_at")
      .eq("machine_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const health = healthRes.data?.[0] ?? null;
  const now = Date.now(); // eslint-disable-line react-hooks/purity -- server component, not a render purity issue
  const isOnline = machine.last_seen_at &&
    new Date(machine.last_seen_at).getTime() > now - 5 * 60 * 1000;

  return (
    <div>
      <div className="mb-6">
        <Link href="/machines" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Machines
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold text-foreground">
            {machine.name || machine.machine_uuid.slice(0, 12)}
          </h1>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${
            isOnline
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-zinc-600"}`} />
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
        {machine.last_seen_at && (
          <p className="text-sm text-muted-foreground mt-1">
            Last seen: {new Date(machine.last_seen_at).toLocaleString()}
          </p>
        )}
      </div>

      {/* Remote Access */}
      {machine.wg_ip && machine.license_tier === "pro" && (
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Remote Access</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tunnel IP: <span className="font-mono">{machine.wg_ip}</span>
            </p>
          </div>
          {isOnline ? (
            <a
              href={`http://device-${machine.machine_uuid}.admin.symflofi.cloud`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Open Admin Panel
            </a>
          ) : (
            <span className="inline-flex items-center px-4 py-2 rounded-lg bg-zinc-800 text-zinc-500 text-sm font-medium cursor-not-allowed">
              Device Offline
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Machine Info */}
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6 lg:col-span-2">
          <h3 className="text-sm font-medium text-foreground mb-4">Machine Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">UUID</p>
              <p className="text-foreground font-mono text-xs mt-0.5">{machine.machine_uuid}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tier</p>
              <div className="mt-0.5"><TierBadge tier={machine.license_tier} /></div>
            </div>
            <div>
              <p className="text-muted-foreground">Hardware</p>
              <p className="text-foreground mt-0.5">{machine.hardware || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">App Version</p>
              <p className="text-foreground font-mono text-xs mt-0.5">{machine.app_version || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">OS Version</p>
              <p className="text-foreground font-mono text-xs mt-0.5">{machine.os_version || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">IP Address</p>
              <p className="text-foreground font-mono text-xs mt-0.5">{machine.ip_address || "-"}</p>
            </div>
            {machine.operators && (
              <div>
                <p className="text-muted-foreground">Operator</p>
                <p className="text-foreground mt-0.5">{machine.operators.name || machine.operators.email}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">License Key</p>
              <p className="text-foreground font-mono text-xs mt-0.5">{machine.license_key || "-"}</p>
            </div>
          </div>
        </div>

        {/* Health */}
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
          <h3 className="text-sm font-medium text-foreground mb-4">Health</h3>
          {health ? (
            <div className="space-y-4">
              <HealthBar label="CPU" value={Number(health.cpu_percent)} unit="%" />
              <HealthBar label="RAM" value={Number(health.ram_percent)} unit="%" />
              <HealthBar label="Disk" value={Number(health.disk_percent)} unit="%" />
              {health.temperature !== null && (
                <HealthBar label="Temperature" value={Number(health.temperature)} unit="C" />
              )}
              {health.uptime_secs !== null && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="text-foreground font-medium">
                    {Math.floor(health.uptime_secs / 3600)}h {Math.floor((health.uptime_secs % 3600) / 60)}m
                  </span>
                </div>
              )}
              {health.connected_clients !== null && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Connected Clients</span>
                  <span className="text-foreground font-medium">{health.connected_clients}</span>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground/60 pt-2">
                Updated: {new Date(health.recorded_at).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No health data yet</p>
          )}
        </div>
      </div>

      <ActivityFeed activities={activitiesRes.data ?? []} />
    </div>
  );
}
