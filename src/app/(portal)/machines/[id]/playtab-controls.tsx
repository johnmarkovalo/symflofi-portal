"use client";

import { useState } from "react";
import { sendPlayTabCommand } from "./actions";
import { useToast } from "@/components/toast";

type TabletStatus = {
  backend: string;
  tier: string;
  deep_freeze: boolean;
  today: {
    sessions: number;
    coins: number;
    earnings: number;
    duration_seconds: number;
  };
};

type DailyEarning = {
  date: string;
  session_count: number;
  total_coins: number;
  total_earnings: number;
  total_duration_seconds: number;
};

type Session = {
  id: string;
  coins_inserted: number;
  duration_seconds: number;
  earnings: number;
  started_at: string;
  ended_at: string | null;
};

type TabletSettings = {
  admin_pin: string;
  deep_freeze: boolean;
  deep_freeze_grace: number;
  business_name: string;
};

export default function PlayTabControls({
  machineId,
  isOnline,
}: {
  machineId: string;
  isOnline: boolean;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<TabletStatus | null>(null);
  const [earnings, setEarnings] = useState<DailyEarning[] | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [settings, setSettings] = useState<TabletSettings | null>(null);
  const [activeTab, setActiveTab] = useState<"status" | "earnings" | "sessions" | "settings">("status");

  async function runCommand(command: string, payload: Record<string, unknown> = {}) {
    setLoading(command);
    const res = await sendPlayTabCommand(machineId, command, payload);
    setLoading(null);

    if (res.error) {
      toast(res.error, "error");
      return null;
    }
    return res.result;
  }

  async function fetchStatus() {
    const result = await runCommand("get_status");
    if (result) setStatus(result as TabletStatus);
  }

  async function fetchEarnings() {
    const result = await runCommand("get_earnings", { days: 30 });
    if (result) setEarnings((result as { daily: DailyEarning[] }).daily);
  }

  async function fetchSessions() {
    const result = await runCommand("get_sessions", { days: 7 });
    if (result) setSessions((result as { sessions: Session[] }).sessions);
  }

  async function fetchSettings() {
    const result = await runCommand("get_settings");
    if (result) setSettings(result as TabletSettings);
  }

  async function updateSetting(key: string, value: unknown) {
    const result = await runCommand("update_settings", { [key]: value });
    if (result) {
      toast("Setting updated", "success");
      fetchSettings();
    }
  }

  function formatDuration(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  if (!isOnline) {
    return (
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
        <h3 className="text-sm font-medium text-foreground mb-2">PlayTab Remote Controls</h3>
        <p className="text-xs text-muted-foreground">Device is offline. Controls will be available when the tablet reconnects.</p>
      </div>
    );
  }

  const tabs = [
    { id: "status" as const, label: "Status" },
    { id: "earnings" as const, label: "Earnings" },
    { id: "sessions" as const, label: "Sessions" },
    { id: "settings" as const, label: "Settings" },
  ];

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">PlayTab Remote Controls</h3>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-muted/50 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status Tab */}
      {activeTab === "status" && (
        <div>
          {!status ? (
            <div className="text-center py-6">
              <button
                onClick={fetchStatus}
                disabled={loading !== null}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
              >
                {loading === "get_status" ? "Fetching..." : "Fetch Live Status"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground">Today&apos;s Sessions</p>
                  <p className="text-lg font-bold text-foreground">{status.today.sessions}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground">Today&apos;s Earnings</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {"\u20B1"}{status.today.earnings.toLocaleString()}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground">Coins Today</p>
                  <p className="text-lg font-bold text-foreground">{status.today.coins}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground">Play Time Today</p>
                  <p className="text-lg font-bold text-foreground">{formatDuration(status.today.duration_seconds)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2">
                <div className="flex gap-3">
                  <span className="text-muted-foreground">
                    Backend: <span className="text-foreground">{status.backend}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Deep Freeze: <span className={status.deep_freeze ? "text-emerald-400" : "text-zinc-500"}>{status.deep_freeze ? "On" : "Off"}</span>
                  </span>
                </div>
                <button
                  onClick={fetchStatus}
                  disabled={loading !== null}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {loading === "get_status" ? "..." : "Refresh"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Earnings Tab */}
      {activeTab === "earnings" && (
        <div>
          {!earnings ? (
            <div className="text-center py-6">
              <button
                onClick={fetchEarnings}
                disabled={loading !== null}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
              >
                {loading === "get_earnings" ? "Fetching..." : "Fetch Earnings (30 days)"}
              </button>
            </div>
          ) : earnings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No earnings data yet</p>
          ) : (
            <div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {earnings.map((day) => (
                  <div key={day.date} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground font-mono">{day.date}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{day.session_count} sessions</span>
                      <span className="text-muted-foreground">{day.total_coins} coins</span>
                      <span className="text-emerald-400 font-semibold">
                        {"\u20B1"}{day.total_earnings.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border/50 mt-2">
                <span className="text-xs font-medium text-foreground">
                  Total: {"\u20B1"}{earnings.reduce((s, d) => s + d.total_earnings, 0).toLocaleString()}
                </span>
                <button
                  onClick={fetchEarnings}
                  disabled={loading !== null}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {loading === "get_earnings" ? "..." : "Refresh"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === "sessions" && (
        <div>
          {!sessions ? (
            <div className="text-center py-6">
              <button
                onClick={fetchSessions}
                disabled={loading !== null}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
              >
                {loading === "get_sessions" ? "Fetching..." : "Fetch Sessions (7 days)"}
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No sessions yet</p>
          ) : (
            <div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                    <div>
                      <span className="text-muted-foreground font-mono">
                        {new Date(s.started_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{formatDuration(s.duration_seconds)}</span>
                      <span className="text-muted-foreground">{s.coins_inserted} coins</span>
                      <span className="text-emerald-400 font-semibold">{"\u20B1"}{s.earnings}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-3">
                <button
                  onClick={fetchSessions}
                  disabled={loading !== null}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {loading === "get_sessions" ? "..." : "Refresh"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div>
          {!settings ? (
            <div className="text-center py-6">
              <button
                onClick={fetchSettings}
                disabled={loading !== null}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
              >
                {loading === "get_settings" ? "Fetching..." : "Fetch Settings"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <SettingRow
                label="Admin PIN"
                value={settings.admin_pin}
                onSave={(v) => updateSetting("admin_pin", v)}
                disabled={loading !== null}
              />
              <SettingRow
                label="Business Name"
                value={settings.business_name}
                onSave={(v) => updateSetting("business_name", v)}
                disabled={loading !== null}
              />
              <div className="flex items-center justify-between text-xs py-2">
                <span className="text-muted-foreground">Deep Freeze</span>
                <button
                  onClick={() => updateSetting("deep_freeze", !settings.deep_freeze)}
                  disabled={loading !== null}
                  className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                    settings.deep_freeze
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                      : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20"
                  }`}
                >
                  {loading === "update_settings" ? "..." : settings.deep_freeze ? "Enabled" : "Disabled"}
                </button>
              </div>
              <SettingRow
                label="Deep Freeze Grace (sec)"
                value={String(settings.deep_freeze_grace)}
                onSave={(v) => updateSetting("deep_freeze_grace", parseInt(v) || 60)}
                disabled={loading !== null}
              />
              <div className="flex justify-end pt-2">
                <button
                  onClick={fetchSettings}
                  disabled={loading !== null}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {loading === "get_settings" ? "..." : "Refresh"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SettingRow({
  label,
  value,
  onSave,
  disabled,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function handleSave() {
    if (draft !== value) {
      onSave(draft);
    }
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between text-xs py-2">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-foreground font-mono">{value || "-"}</span>
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-xs py-2 gap-2">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          autoFocus
          className="bg-muted/50 border border-border rounded-md px-2 py-1 text-xs text-foreground font-mono w-32 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        />
        <button
          onClick={handleSave}
          className="px-2 py-1 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-2 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
