"use client";
/**
 * ClientScheduleViewer (v5 — no iframe)
 * ───────────────────────────────────────
 * Fetches the schedule data directly from the API and renders it inline
 * inside the modal overlay. No iframe, no login-page bleed, works perfectly
 * on Capacitor/iOS/Android because there is no separate browsing context.
 */

import React, { useEffect, useState } from "react";
import { AlertCircle, Dumbbell, Loader2, X } from "lucide-react";
import { authSession } from "@/services/api";

interface Props { assignmentId: string; title?: string; onClose: () => void; }

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

async function loadSchedule(assignmentId: string): Promise<any> {
  const session = authSession.get();
  if (!session?.token) throw new Error("Not signed in.");
  const res = await fetch(
    `${API_BASE_URL}/athlete/${encodeURIComponent(session.PK)}/schedules/${encodeURIComponent(assignmentId)}`,
    { headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" } }
  );
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const j = await res.json(); if (j.detail) msg = j.detail; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

function humanDate(value: string) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const pillStyle: React.CSSProperties = {
  fontSize: 11, padding: "5px 9px", borderRadius: 8,
  background: "rgb(var(--ink-rgb) / 0.06)", color: "rgb(var(--ink-rgb) / 0.78)",
  border: "1px solid rgb(var(--ink-rgb) / 0.08)",
};

export default function ClientScheduleViewer({ assignmentId, title, onClose }: Props) {
  const [schedule, setSchedule] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Escape key closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Fetch schedule data directly — no iframe, no separate browsing context
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSchedule(null);
    (async () => {
      try {
        const data = await loadSchedule(assignmentId);
        if (!cancelled) setSchedule(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Could not load this schedule.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assignmentId]);

  const exercises: any[] = Array.isArray(schedule?.exercises) ? schedule.exercises : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ? `${title} schedule` : "Workout schedule"}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgb(var(--well-rgb) / 0.82)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{
        width: "min(740px,100%)", height: "min(92vh,860px)",
        display: "flex", flexDirection: "column",
        background: "#070707", border: "1px solid rgb(var(--ink-rgb) / 0.11)",
        borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 100px rgb(var(--well-rgb) / 0.6)",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "13px 14px 13px 20px",
          borderBottom: "1px solid rgb(var(--ink-rgb) / 0.07)",
          background: "rgb(var(--ink-rgb) / 0.022)", flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9, color: "var(--text-secondary)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              ASSIGNED WORKOUT
            </div>
            <div style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 700, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title || "Workout Schedule"}
            </div>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close workout schedule"
            style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgb(var(--ink-rgb) / 0.10)", background: "rgb(var(--ink-rgb) / 0.04)", color: "var(--text-primary)", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px 32px", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>

          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 200, color: "var(--text-secondary)" }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              <span>Loading schedule…</span>
            </div>
          )}

          {!loading && error && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, textAlign: "center", gap: 12 }}>
              <AlertCircle size={28} color="var(--accent-gold)" />
              <div style={{ fontSize: 15, fontWeight: 700 }}>Schedule unavailable</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 320 }}>{error}</div>
            </div>
          )}

          {!loading && schedule && (
            <>
              {/* Title block */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: "var(--accent-gold)", fontSize: 9, letterSpacing: "0.16em", fontWeight: 700, textTransform: "uppercase" }}>THE BLUE FIT</div>
                <h1 style={{ fontSize: 22, margin: "6px 0 0", lineHeight: 1.2, color: "var(--text-primary)" }}>
                  {schedule.templateTitle || "Workout Schedule"}
                </h1>
                <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 6 }}>
                  Starts {humanDate(schedule.startDate)}
                  {schedule.goal   ? ` · ${schedule.goal}`  : ""}
                  {schedule.level  ? ` · ${schedule.level}` : ""}
                </div>
              </div>

              {/* Meta pills */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 16 }}>
                {[
                  ["Days",      schedule.workoutDays       || "—"],
                  ["Duration",  schedule.estimatedDuration || "—"],
                  ["Equipment", schedule.equipment         || "—"],
                ].map(([label, value]) => (
                  <div key={String(label)} style={{ background: "rgb(var(--ink-rgb) / 0.03)", border: "1px solid rgb(var(--ink-rgb) / 0.07)", borderRadius: 13, padding: 13 }}>
                    <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--text-secondary)", textTransform: "uppercase" }}>{label}</div>
                    <div style={{ marginTop: 5, fontSize: 13 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Coach notes */}
              {schedule.notes && (
                <div style={{ marginBottom: 16, background: "rgb(var(--gold-rgb) / 0.05)", border: "1px solid rgb(var(--gold-rgb) / 0.14)", borderRadius: 13, padding: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--accent-gold)", textTransform: "uppercase" }}>Coach notes</div>
                  <div style={{ marginTop: 7, color: "rgb(var(--ink-rgb) / 0.80)", fontSize: 13, lineHeight: 1.6 }}>{schedule.notes}</div>
                </div>
              )}

              {/* Exercises */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {exercises.length === 0 && (
                  <div style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>No exercises listed.</div>
                )}
                {exercises.map((ex: any, index: number) => (
                  <section
                    key={String(ex.id || ex.order || index)}
                    style={{ background: "rgb(var(--ink-rgb) / 0.032)", border: "1px solid rgb(var(--ink-rgb) / 0.07)", borderRadius: 14, padding: 15 }}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "rgb(var(--green-rgb) / 0.09)", color: "var(--accent-green)", flexShrink: 0 }}>
                        <Dumbbell size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <h2 style={{ fontSize: 14, margin: 0, color: "var(--text-primary)" }}>{index + 1}. {ex.name || "Exercise"}</h2>
                          {ex.section && <span style={{ fontSize: 10, color: "var(--accent-gold)", whiteSpace: "nowrap" }}>{ex.section}</span>}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
                          {ex.sets   && <span style={pillStyle}>{ex.sets} sets</span>}
                          {ex.reps   && <span style={pillStyle}>{ex.reps}</span>}
                          {ex.rpe    && <span style={pillStyle}>RPE {ex.rpe}</span>}
                          {ex.weight && <span style={pillStyle}>{ex.weight}</span>}
                          {ex.rest   && <span style={pillStyle}>Rest {ex.rest}</span>}
                          {ex.tempo  && <span style={pillStyle}>Tempo {ex.tempo}</span>}
                        </div>
                        {ex.notes && (
                          <div style={{ marginTop: 9, color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.55 }}>{ex.notes}</div>
                        )}
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
