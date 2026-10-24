"use client";
/**
 * Schedule View — loaded inside an iframe from ClientScheduleViewer.
 * Fix 4: This page reads the session token directly from localStorage
 * (via authSession) and makes its own authenticated API call, bypassing
 * the client layout auth-guard that would redirect the iframe to login.
 */

import React, { useEffect, useState } from "react";
import { AlertCircle, Dumbbell, Loader2 } from "lucide-react";
import { dashboardAPI, authSession } from "@/services/api";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

async function fetchScheduleDirect(assignmentId: string): Promise<any> {
  // Fix 4: Read session directly from localStorage so this works inside an iframe
  // even if the parent layout's auth guard has not run in this browsing context.
  const session = authSession.get();
  if (!session?.token) throw new Error("Please sign in to view this schedule.");
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
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function ClientScheduleViewPage() {
  const [schedule, setSchedule] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const assignmentId = (params.get("assignmentId") || "").trim();

    if (!assignmentId) {
      setError("No schedule was selected.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchScheduleDirect(assignmentId);
        if (!cancelled) setSchedule(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Could not load this schedule.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: 24,
          display: "grid",
          placeItems: "center",
          color: "var(--text-primary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)" }}>
          <Loader2 size={18} className="animate-spin" /> Loading schedule…
        </div>
      </main>
    );
  }

  if (error || !schedule) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: 24,
          display: "grid",
          placeItems: "center",
          color: "var(--text-primary)",
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: "100%",
            background: "rgb(var(--ink-rgb) / 0.03)",
            border: "1px solid rgb(var(--ink-rgb) / 0.08)",
            borderRadius: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <AlertCircle size={28} color="var(--accent-gold)" style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 15, fontWeight: 700 }}>Schedule unavailable</div>
          <div style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 13 }}>
            {error || "This schedule could not be loaded."}
          </div>
        </div>
      </main>
    );
  }

  const exercises = Array.isArray(schedule.exercises) ? schedule.exercises : [];

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-elev)", color: "var(--text-primary)", padding: "24px 18px 40px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "var(--accent-gold)", fontSize: 10, letterSpacing: "0.16em", fontWeight: 700 }}>THE BLUE FIT</div>
          <h1 style={{ fontSize: 26, margin: "6px 0 0", lineHeight: 1.2 }}>{schedule.templateTitle || "Workout Schedule"}</h1>
          <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 7 }}>
            Starts {humanDate(schedule.startDate)}
            {schedule.goal ? ` · ${schedule.goal}` : ""}
            {schedule.level ? ` · ${schedule.level}` : ""}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 18 }}>
          {[
            ["Days", schedule.workoutDays || "—"],
            ["Duration", schedule.estimatedDuration || "—"],
            ["Equipment", schedule.equipment || "—"],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ background: "rgb(var(--ink-rgb) / 0.035)", border: "1px solid rgb(var(--ink-rgb) / 0.08)", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--text-secondary)", textTransform: "uppercase" }}>{label}</div>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.35 }}>{value}</div>
            </div>
          ))}
        </div>

        {schedule.notes && (
          <div style={{ marginBottom: 18, background: "rgb(var(--gold-rgb) / 0.05)", border: "1px solid rgb(var(--gold-rgb) / 0.15)", borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--accent-gold)", textTransform: "uppercase" }}>Coach notes</div>
            <div style={{ marginTop: 7, color: "rgb(var(--ink-rgb) / 0.82)", fontSize: 13, lineHeight: 1.55 }}>{schedule.notes}</div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {exercises.map((ex: any, index: number) => (
            <section key={String(ex.id || ex.order || index)} style={{ background: "rgb(var(--ink-rgb) / 0.035)", border: "1px solid rgb(var(--ink-rgb) / 0.08)", borderRadius: 15, padding: 15 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "rgb(var(--green-rgb) / 0.09)", color: "var(--accent-green)", flexShrink: 0 }}><Dumbbell size={16} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <h2 style={{ fontSize: 15, margin: 0 }}>{index + 1}. {ex.name || "Exercise"}</h2>
                    {ex.section && <span style={{ fontSize: 10, color: "var(--accent-gold)", whiteSpace: "nowrap" }}>{ex.section}</span>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {ex.sets && <span style={pillStyle}>{ex.sets} sets</span>}
                    {ex.reps && <span style={pillStyle}>{ex.reps}</span>}
                    {ex.rpe && <span style={pillStyle}>RPE {ex.rpe}</span>}
                    {ex.weight && <span style={pillStyle}>{ex.weight}</span>}
                    {ex.rest && <span style={pillStyle}>Rest {ex.rest}</span>}
                    {ex.tempo && <span style={pillStyle}>Tempo {ex.tempo}</span>}
                  </div>
                  {ex.notes && <div style={{ marginTop: 10, color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5 }}>{ex.notes}</div>}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

const pillStyle: React.CSSProperties = { fontSize: 11, padding: "6px 8px", borderRadius: 8, background: "rgb(var(--ink-rgb) / 0.05)", color: "rgb(var(--ink-rgb) / 0.8)" };
