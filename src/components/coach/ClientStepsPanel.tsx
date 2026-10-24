"use client";

import React from "react";
import Link from "next/link";
import { Footprints, MessageSquare, Moon, Dumbbell, Users } from "lucide-react";
import type { CoachClient } from "@/services/api";
import { Avatar, PresenceBadge } from "@/components/shared/Presence";
import { fmtNum } from "@/lib/format";

/** Per-client steps / sleep / workouts for the coach (real data from the coach dashboard). */
export default function ClientStepsPanel({ clients, goal = 10000, loading }: { clients: CoachClient[]; goal?: number; loading?: boolean }) {
  return (
    <section className="app-card fade-in" style={{ marginTop: 24 }}>
      <div className="section-header" style={{ marginBottom: 18, justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 5 }}>Client steps &amp; activity</h3>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Latest logged steps, sleep and workouts for each athlete.</span>
        </div>
        <Footprints size={18} color="var(--accent-green)" />
      </div>

      {loading ? (
        <div style={{ padding: 30, textAlign: "center", color: "var(--text-secondary)" }}>Loading clients…</div>
      ) : clients.length === 0 ? (
        <div style={{ padding: 28, textAlign: "center", color: "var(--text-secondary)" }}>
          <Users size={22} style={{ marginBottom: 8 }} /><div>No clients assigned yet.</div>
        </div>
      ) : (
        <div className="plan-cards-container">
          {clients.map((c) => {
            const p = c.stepsToday != null ? Math.min(100, Math.round((c.stepsToday / goal) * 100)) : 0;
            return (
              <div key={c.id} className="plan-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 14, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Link href={`/coach/clients/details?id=${encodeURIComponent(c.id)}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, color: "inherit", textDecoration: "none" }}>
                    <Avatar name={c.name} presence={c.presence} />
                    <span style={{ minWidth: 0 }}>
                      <span className="plan-item-name" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                      <span style={{ marginTop: 5, display: "inline-flex" }}><PresenceBadge presence={c.presence} lastSeenAt={c.lastSeenAt} /></span>
                    </span>
                  </Link>
                  <Link href={`/coach/messages?client=${encodeURIComponent(c.id)}`} className="icon-btn" aria-label={`Message ${c.name}`} style={{ color: "var(--text-secondary)", position: "relative" }}>
                    <MessageSquare size={19} />
                    {!!c.unreadMessages && <span className="msg-badge" style={{ position: "absolute", top: -8, right: -10, margin: 0 }}>{c.unreadMessages}</span>}
                  </Link>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span className="label-text">Steps · {c.stepsDate || "no data"}</span>
                    <span style={{ fontWeight: 700, fontSize: 18 }}>{fmtNum(c.stepsToday)}<span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}> / {fmtNum(goal)}</span></span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "rgb(var(--ink-rgb) / 0.08)", overflow: "hidden" }}>
                    <div style={{ width: `${p}%`, height: "100%", background: "var(--accent-green)", borderRadius: 999, transition: "width .5s ease" }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: 12, color: "var(--text-secondary)" }}>
                  <span><Footprints size={12} style={{ verticalAlign: "-2px" }} /> 7d avg <b style={{ color: "var(--text-primary)" }}>{fmtNum(c.stepsAvg7d)}</b></span>
                  <span><Dumbbell size={12} style={{ verticalAlign: "-2px" }} /> <b style={{ color: "var(--text-primary)" }}>{c.workoutsPlanned7d ? `${c.workoutsDone7d}/${c.workoutsPlanned7d}` : "—"}</b> 7d</span>
                  <span><Moon size={12} style={{ verticalAlign: "-2px" }} /> <b style={{ color: "var(--text-primary)" }}>{c.sleepHours != null ? `${fmtNum(c.sleepHours, 1)}h` : "—"}</b></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
