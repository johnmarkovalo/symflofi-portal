import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getUserContext } from "@/lib/roles";
import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import OperatorAssign from "./operator-assign";
import RevokeLicenseButton from "./revoke-button";

const eventLabels: Record<string, string> = {
  created: "Created",
  assigned: "Assigned",
  transferred: "Transferred",
  activated: "Activated",
  expired: "Expired",
  revoked: "Revoked",
  purchased: "Purchased",
};

const eventColors: Record<string, string> = {
  created: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  assigned: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  transferred: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  activated: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  expired: "text-red-400 bg-red-500/10 border-red-500/20",
  revoked: "text-red-400 bg-red-500/10 border-red-500/20",
  purchased: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

const eventIcons: Record<string, string> = {
  created: "M12 4.5v15m7.5-7.5h-15",
  assigned: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  transferred: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
  activated: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  expired: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  revoked: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  purchased: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
};

const tierStyles: Record<string, string> = {
  enterprise: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  pro: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  lite: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  demo: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export const dynamic = "force-dynamic";

export default async function LicenseInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getUserContext();
  if (!ctx || !ctx.role) redirect("/signin");

  const { id } = await params;
  const supabase = await createClient();
  const isAdmin = ctx.role === "admin";

  // Get the license key
  const { data: license } = await supabase
    .from("license_keys")
    .select("*, operators(id, name, email)")
    .eq("id", id)
    .single();

  if (!license) notFound();

  // Non-admin can only see their own license
  if (!isAdmin && license.operator_id !== ctx.operatorId) {
    redirect("/licenses");
  }

  // Get the machine bound to this license
  let machine: { id: string; machine_uuid: string; name: string | null } | null = null;
  if (license.machine_id) {
    const { data } = await supabase
      .from("machines")
      .select("id, machine_uuid, name")
      .eq("id", license.machine_id)
      .single();
    machine = data;
  }

  // Get all operators for assignment dropdown (admin only)
  let operators: { id: string; name: string | null; email: string }[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("operators")
      .select("id, name, email")
      .order("name");
    operators = data ?? [];
  }

  // Get audit log
  const { data: auditLog } = await supabase
    .from("license_audit_log")
    .select("*")
    .eq("license_key_id", id)
    .order("created_at", { ascending: false });

  // Fetch operator names for audit display
  const operatorIds = new Set<string>();
  for (const entry of auditLog ?? []) {
    if (entry.from_operator_id) operatorIds.add(entry.from_operator_id);
    if (entry.to_operator_id) operatorIds.add(entry.to_operator_id);
    if (entry.actor_id) operatorIds.add(entry.actor_id);
  }

  const operatorMap: Record<string, { name: string | null; email: string }> = {};
  if (operatorIds.size > 0) {
    const { data: ops } = await supabase
      .from("operators")
      .select("id, name, email")
      .in("id", Array.from(operatorIds));
    for (const op of ops ?? []) {
      operatorMap[op.id] = { name: op.name, email: op.email };
    }
  }

  function getOperatorLabel(opId: string | null) {
    if (!opId) return null;
    const op = operatorMap[opId];
    return op ? (op.name || op.email) : opId.slice(0, 8);
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/licenses" className="text-muted-foreground hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground font-mono">{license.key}</h1>
          <p className="text-sm text-muted-foreground mt-1">License details</p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${tierStyles[license.tier] ?? tierStyles.demo}`}>
          {license.tier}
        </span>
        {(license.is_activated || license.machine_id) && (
          <RevokeLicenseButton
            licenseId={license.id}
            hasOperator={!!license.operator_id}
            isAdmin={isAdmin}
          />
        )}
      </div>

      {/* License info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
          <p className="text-sm font-medium text-foreground mt-1">
            {license.is_revoked ? (
              <span className="text-red-400">Revoked</span>
            ) : license.is_activated && license.machine_id ? (
              <span className="text-emerald-400">Activated</span>
            ) : license.is_activated && !license.machine_id ? (
              <span className="text-amber-400">Unbound</span>
            ) : (
              <span className="text-amber-400">Unactivated</span>
            )}
          </p>
        </div>
        {license.operators?.id ? (
          <Link href={`/operators/${license.operators.id}`} className="bg-card/80 backdrop-blur-sm rounded-xl border border-border p-4 hover:border-primary/30 transition-all group">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Owner</p>
            <p className="text-sm font-medium text-primary mt-1 group-hover:text-primary/80 truncate">
              {license.operators.name || license.operators.email}
            </p>
          </Link>
        ) : (
          <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Owner</p>
            <p className="text-sm font-medium text-amber-400 mt-1">Unassigned</p>
          </div>
        )}
        {machine ? (
          <Link href={`/machines/${machine.id}`} className="bg-card/80 backdrop-blur-sm rounded-xl border border-border p-4 hover:border-primary/30 transition-all group">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Machine</p>
            <p className="text-sm font-medium text-primary mt-1 group-hover:text-primary/80 truncate">
              {machine.name || machine.machine_uuid.slice(0, 12)}
            </p>
          </Link>
        ) : (
          <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Machine</p>
            <p className="text-sm font-medium text-amber-400 mt-1">Unbound</p>
          </div>
        )}
        <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Created</p>
          <p className="text-sm font-medium text-foreground mt-1">
            <LocalTime date={license.created_at} dateOnly />
          </p>
        </div>
        <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Expires</p>
          <p className="text-sm font-medium text-foreground mt-1">
            {license.activated_at ? (
              (() => {
                const expiry = new Date(new Date(license.activated_at).getTime() + (license.duration_days ?? 365) * 86400000);
                const isExpired = expiry < new Date();
                return (
                  <span className={isExpired ? "text-red-400" : "text-foreground"}>
                    <LocalTime date={expiry.toISOString()} dateOnly />
                    {isExpired && " (expired)"}
                  </span>
                );
              })()
            ) : (
              <span className="text-muted-foreground">Not activated</span>
            )}
          </p>
        </div>
      </div>

      {/* Operator assignment (admin only) */}
      {isAdmin && (
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 sm:p-6 mb-8">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Assign Operator
          </h2>
          <OperatorAssign
            licenseId={license.id}
            currentOperatorId={license.operator_id}
            operators={operators}
          />
        </div>
      )}

      {/* Audit timeline */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 sm:p-6">
        <h2 className="font-semibold text-foreground mb-6">Audit Trail</h2>

        {auditLog && auditLog.length > 0 ? (
          <div className="space-y-0">
            {auditLog.map((entry, i) => {
              const color = eventColors[entry.event] ?? "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
              const icon = eventIcons[entry.event] ?? eventIcons.created;
              const isLast = i === auditLog.length - 1;

              return (
                <div key={entry.id} className="flex gap-4">
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${color}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                      </svg>
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-border my-1" />}
                  </div>

                  {/* Content */}
                  <div className={`pb-6 flex-1`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${color.split(" ")[0]}`}>
                        {eventLabels[entry.event] ?? entry.event}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <LocalTime date={entry.created_at} />
                      </span>
                    </div>

                    {/* Event details */}
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {entry.event === "transferred" && (
                        <p>
                          {getOperatorLabel(entry.from_operator_id)} → {getOperatorLabel(entry.to_operator_id)}
                        </p>
                      )}
                      {entry.event === "assigned" && entry.to_operator_id && (
                        <p>Assigned to {getOperatorLabel(entry.to_operator_id)}</p>
                      )}
                      {entry.event === "revoked" && entry.from_operator_id && (
                        <p>Revoked from {getOperatorLabel(entry.from_operator_id)}</p>
                      )}
                      {entry.actor_id && (
                        <p>By: {getOperatorLabel(entry.actor_id)} ({entry.actor_role})</p>
                      )}
                      {entry.note && <p className="text-muted-foreground/80 italic">{entry.note}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No audit entries yet</p>
        )}
      </div>
    </div>
  );
}
