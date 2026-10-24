"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, CalendarCheck, Clock3, Dumbbell, KeyRound, Loader2, LogIn,
  Lock, LogOut, Pause, Play, RefreshCw, Search, ShieldCheck, UserX, Users, Wifi,
} from "lucide-react";
import { AdminMonitor, MonitorUser, Presence, dashboardAPI } from "@/services/api";
import { mix } from "@/lib/format";

type RoleTab = "ALL" | "CLIENT" | "COACH";
type PresenceFilter = "ALL" | Presence;

const PRESENCE: Record<Presence, { label: string; color: string; hint: string }> = {
  ONLINE: { label: "Online now", color: "var(--accent-green)", hint: "App open and active within the last 2½ minutes" },
  TODAY: { label: "Active today", color: "var(--blue)", hint: "Seen in the last 24 hours" },
  RECENT: { label: "This week", color: "var(--accent-gold)", hint: "Seen in the last 7 days" },
  INACTIVE: { label: "Inactive", color: "var(--danger)", hint: "Not seen for 7+ days" },
  NEVER: { label: "Never signed in", color: "var(--text-secondary)", hint: "Account created, not used yet" },
};

function ago(iso?: string | null): string {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  const secs = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 1000));
  if (secs < 45) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  const days = Math.floor(secs / 86400);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function absolute(iso?: string | null): string {
  if (!iso) return "Never";
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? iso : dt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function PresenceDot({ presence }: { presence: Presence }) {
  const { color } = PRESENCE[presence];
  return (
    <span
      aria-hidden="true"
      className={presence === "ONLINE" ? "bf-monitor-pulse" : undefined}
      style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0, ["--dot" as string]: color } as React.CSSProperties}
    />
  );
}

function SummaryTile({ icon: Icon, label, value, color, onClick, active }: {
  icon: React.ElementType; label: string; value: number | string; color: string; onClick?: () => void; active?: boolean;
}) {
  const content = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={16} color={color} />
        <span className="plan-item-category" style={{ margin: 0 }}>{label}</span>
      </div>
      <strong style={{ fontSize: 26, color, lineHeight: 1 }}>{value}</strong>
    </>
  );
  const style: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: 12, padding: 16, textAlign: "left",
    background: active ? `${mix(color, "14")}` : "rgb(var(--ink-rgb) / 0.03)",
    border: `1px solid ${active ? `${mix(color, "66")}` : "rgb(var(--ink-rgb) / 0.08)"}`,
    borderRadius: 16, color: "inherit", font: "inherit",
  };
  return onClick
    ? <button type="button" onClick={onClick} style={{ ...style, cursor: "pointer" }}>{content}</button>
    : <div style={style}>{content}</div>;
}

function Chip({ icon: Icon, children, color = "var(--text-secondary)", title }: { icon?: React.ElementType; children: React.ReactNode; color?: string; title?: string }) {
  return (
    <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color, background: "rgb(var(--ink-rgb) / 0.04)", border: "1px solid rgb(var(--ink-rgb) / 0.07)", borderRadius: 8, padding: "4px 8px" }}>
      {Icon && <Icon size={12} />}{children}
    </span>
  );
}

function UserCard({ user }: { user: MonitorUser }) {
  const p = PRESENCE[user.presence];
  const isClient = user.role === "CLIENT";
  return (
    <article style={{ background: "rgb(var(--ink-rgb) / 0.03)", border: "1px solid rgb(var(--ink-rgb) / 0.08)", borderLeft: `3px solid ${p.color}`, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <PresenceDot presence={user.presence} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.id}{user.email ? ` · ${user.email}` : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: isClient ? "var(--blue)" : "var(--accent-gold)", background: isClient ? "rgb(var(--blue-rgb) / 0.1)" : "rgb(var(--gold-rgb) / 0.1)", border: `1px solid ${isClient ? "rgb(var(--blue-rgb) / 0.3)" : "rgb(var(--gold-rgb) / 0.3)"}`, padding: "3px 8px", borderRadius: 6 }}>
            {user.role}
          </span>
          <span title={p.hint} style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: p.color, background: `${mix(p.color, "18")}`, border: `1px solid ${mix(p.color, "44")}`, padding: "3px 8px", borderRadius: 6 }}>
            {p.label.toUpperCase()}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {user.signedOut && user.presence !== "NEVER" && (
          <Chip icon={LogOut} title={`Signed out ${absolute(user.lastLogoutAt)}`}>Signed out</Chip>
        )}
        <Chip icon={Clock3} title={absolute(user.lastSeenAt)}>Last seen {ago(user.lastSeenAt)}</Chip>
        <Chip icon={LogIn} title={absolute(user.lastLoginAt)}>Login {ago(user.lastLoginAt)} · {user.loginCount}×</Chip>
        {isClient ? (
          <>
            <Chip icon={CalendarCheck} title={absolute(user.lastCheckInAt)}>Check-in {ago(user.lastCheckInAt)}</Chip>
            <Chip icon={Dumbbell}>{user.workoutsThisWeek ?? 0} workouts / 7d</Chip>
            <Chip icon={Activity}>{user.plansAssigned ?? 0} plan{user.plansAssigned === 1 ? "" : "s"}</Chip>
            <Chip icon={Users} color={user.coachName ? "var(--text-secondary)" : "var(--danger)"}>
              {user.coachName ? `Coach: ${user.coachName}` : "No coach assigned"}
            </Chip>
          </>
        ) : (
          <>
            <Chip icon={Users}>{user.clientCount ?? 0} client{user.clientCount === 1 ? "" : "s"}</Chip>
            <Chip icon={Wifi} color={(user.clientsOnlineNow ?? 0) > 0 ? "var(--accent-green)" : undefined}>{user.clientsOnlineNow ?? 0} online now</Chip>
            <Chip icon={AlertTriangle} color={(user.clientsNeedingAttention ?? 0) > 0 ? "var(--danger)" : undefined}>{user.clientsNeedingAttention ?? 0} need attention</Chip>
            <Chip icon={Dumbbell}>{user.templates ?? 0} template{user.templates === 1 ? "" : "s"}</Chip>
          </>
        )}
        {user.pendingFirstLogin && <Chip icon={KeyRound} color="var(--accent-gold)">Temp password pending</Chip>}
        {user.accountStatus === "LOCKED" && <Chip icon={Lock} color="var(--danger)">Locked (failed logins)</Chip>}
        {user.accountStatus === "DISABLED" && <Chip icon={UserX} color="var(--danger)">Disabled</Chip>}
      </div>
    </article>
  );
}

export default function AdminMonitorPage() {
  const [data, setData] = useState<AdminMonitor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [live, setLive] = useState(true);
  const [tab, setTab] = useState<RoleTab>("ALL");
  const [presence, setPresence] = useState<PresenceFilter>("ALL");
  const [query, setQuery] = useState("");
  const [, setTick] = useState(0);

  const load = useCallback(async (initial = false) => {
    if (!initial) setIsRefreshing(true);
    try {
      setData(await dashboardAPI.getAdminMonitor());
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Could not load monitor data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  // Live mode: refresh every 30 s while the tab is visible; re-render labels every 15 s.
  useEffect(() => {
    if (!live) return;
    const refresh = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000);
    const labels = window.setInterval(() => setTick((n) => n + 1), 15000);
    return () => { window.clearInterval(refresh); window.clearInterval(labels); };
  }, [live, load]);

  const rows = useMemo(() => {
    const all: MonitorUser[] = [...(data?.coaches ?? []), ...(data?.clients ?? [])];
    const q = query.trim().toLowerCase();
    return all
      .filter((u) => tab === "ALL" || u.role === tab)
      .filter((u) => presence === "ALL" || u.presence === presence)
      .filter((u) => !q || `${u.name} ${u.email} ${u.id} ${u.coachName ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? ""));
  }, [data, tab, presence, query]);

  const s = data?.summary;
  const pickPresence = (p: PresenceFilter) => setPresence((cur) => (cur === p ? "ALL" : p));

  return (
    <div className="container" style={{ maxWidth: 1100, paddingBottom: 60 }}>
      <div className="section-header" style={{ marginBottom: 24, alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="label-text" style={{ color: "var(--text-secondary)", marginBottom: 7, letterSpacing: "0.16em" }}>MASTER ADMIN</div>
          <h1 className="animated-gradient-text" style={{ fontSize: 30, textTransform: "none", marginBottom: 8 }}>Monitor</h1>
          <span className="label-text" style={{ color: "var(--text-secondary)", textTransform: "none" }}>
            Who is signed in, who is active, and who needs a nudge — across every client and coach.
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {data ? `Updated ${ago(data.generatedAt)}` : ""}
          </span>
          <button type="button" className="btn-secondary" onClick={() => setLive((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, flex: "none", whiteSpace: "nowrap" }} aria-pressed={live}>
            {live ? <Pause size={14} /> : <Play size={14} />} {live ? "Live · 30s" : "Paused"}
          </button>
          <button type="button" className="btn-primary" onClick={() => load()} disabled={isRefreshing} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, flex: "none", whiteSpace: "nowrap" }}>
            {isRefreshing ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      {isLoading ? (
        <div className="app-card" style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>Loading monitor…</div>
      ) : data && s ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 22 }}>
            <SummaryTile icon={Wifi} label="Online now" value={s.onlineNow} color="var(--accent-green)" onClick={() => pickPresence("ONLINE")} active={presence === "ONLINE"} />
            <SummaryTile icon={Activity} label="Active today" value={s.activeToday} color="var(--blue)" onClick={() => pickPresence("TODAY")} active={presence === "TODAY"} />
            <SummaryTile icon={Users} label="Clients" value={s.totalClients} color="var(--text-primary)" onClick={() => setTab((t) => (t === "CLIENT" ? "ALL" : "CLIENT"))} active={tab === "CLIENT"} />
            <SummaryTile icon={ShieldCheck} label="Coaches" value={s.totalCoaches} color="var(--accent-gold)" onClick={() => setTab((t) => (t === "COACH" ? "ALL" : "COACH"))} active={tab === "COACH"} />
            <SummaryTile icon={UserX} label="Inactive 7d+" value={s.inactive7d} color="var(--danger)" onClick={() => pickPresence("INACTIVE")} active={presence === "INACTIVE"} />
            <SummaryTile icon={KeyRound} label="Never signed in" value={s.neverSignedIn} color="var(--text-secondary)" onClick={() => pickPresence("NEVER")} active={presence === "NEVER"} />
            <SummaryTile icon={AlertTriangle} label="No coach" value={s.unassignedClients} color="var(--accent-gold)" />
            <SummaryTile icon={Lock} label="Locked / disabled" value={s.lockedAccounts + s.disabledAccounts} color="var(--danger)" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 20 }} className="bf-monitor-layout">
            <section className="app-card fade-in" style={{ padding: 20, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
                <div role="tablist" aria-label="Role filter" style={{ display: "flex", gap: 6 }}>
                  {(["ALL", "CLIENT", "COACH"] as RoleTab[]).map((r) => (
                    <button key={r} type="button" role="tab" aria-selected={tab === r} onClick={() => setTab(r)} className={tab === r ? "btn-primary" : "btn-secondary"} style={{ padding: "8px 14px", fontSize: 12, flex: "none" }}>
                      {r === "ALL" ? "Everyone" : r === "CLIENT" ? "Clients" : "Coaches"}
                    </button>
                  ))}
                </div>
                <select
                  value={presence}
                  onChange={(e) => setPresence(e.target.value as PresenceFilter)}
                  aria-label="Activity filter"
                  style={{ padding: "9px 12px", background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: 12 }}
                >
                  <option value="ALL">Any activity</option>
                  {(Object.keys(PRESENCE) as Presence[]).map((k) => <option key={k} value={k}>{PRESENCE[k].label}</option>)}
                </select>
                <div style={{ position: "relative", flex: "1 1 200px" }}>
                  <Search size={15} color="var(--text-secondary)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, email or coach" aria-label="Search users"
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px", background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", outline: "none", fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 10 }}>{rows.length} shown</div>
              {rows.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--text-secondary)", borderRadius: 14, background: "rgb(var(--ink-rgb) / 0.025)" }}>
                  No users match these filters.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {rows.map((u) => <UserCard key={u.pk} user={u} />)}
                </div>
              )}
            </section>

            <section className="app-card fade-in" style={{ padding: 20, minWidth: 0 }}>
              <h3 style={{ fontSize: 15, margin: "0 0 4px" }}>Recent activity</h3>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Latest sign-ins, check-ins and workouts.</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                {data.recentEvents.length === 0 && <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Nothing yet.</div>}
                {data.recentEvents.map((e, i) => {
                  const Icon = e.type === "login" ? LogIn : e.type === "checkin" ? CalendarCheck : Dumbbell;
                  const verb = e.type === "login" ? "signed in" : e.type === "checkin" ? "submitted a check-in" : "completed a workout";
                  return (
                    <div key={`${e.type}-${e.userId}-${i}`} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 11px", borderRadius: 11, background: "rgb(var(--ink-rgb) / 0.03)", border: "1px solid rgb(var(--ink-rgb) / 0.06)" }}>
                      <Icon size={15} color={e.type === "login" ? "var(--blue)" : e.type === "checkin" ? "var(--accent-gold)" : "var(--accent-green)"} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ minWidth: 0, fontSize: 12, lineHeight: 1.4 }}>
                        <strong>{e.name || e.userId}</strong> <span style={{ color: "var(--text-secondary)" }}>({e.role.toLowerCase()}) {verb}</span>
                        <div style={{ fontSize: 10, color: "var(--text-secondary)" }} title={absolute(e.at)}>{e.type === "workout" ? e.at.slice(0, 10) : ago(e.at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
