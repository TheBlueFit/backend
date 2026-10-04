"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, Dumbbell, Loader2 } from "lucide-react";
import { dashboardAPI } from "@/services/api";

function humanDate(value: string) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function ClientScheduleViewPage() {
  const [assignmentId, setAssignmentId] = useState("");
  const [schedule, setSchedule] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAssignmentId(params.get("assignmentId") || "");
  }, []);

  useEffect(() => {
    if (!assignmentId) {
      if (typeof window !== "undefined" && window.location.search) {
        setError("No schedule was selected.");
      }
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await dashboardAPI.getAthleteScheduleDetail(assignmentId);
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
  }, [assignmentId]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: 24,
          display: "grid",
          placeItems: "center",
          color: "#fff",
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
          color: "#fff",
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: "100%",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <AlertCircle size={28} color="#E5B869" style={{ marginBottom: 10 }} />
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
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", padding: "24px 18px 40px" }}>
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
            <div key={String(label)} style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--text-secondary)", textTransform: "uppercase" }}>{label}</div>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.35 }}>{value}</div>
            </div>
          ))}
        </div>

        {schedule.notes && (
          <div style={{ marginBottom: 18, background: "rgba(229,184,105,0.05)", border: "1px solid rgba(229,184,105,0.15)", borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--accent-gold)", textTransform: "uppercase" }}>Coach notes</div>
            <div style={{ marginTop: 7, color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 1.55 }}>{schedule.notes}</div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {exercises.map((ex: any, index: number) => (
            <section key={String(ex.id || ex.order || index)} style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 15, padding: 15 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "rgba(0,226,123,0.09)", color: "#00E27B", flexShrink: 0 }}><Dumbbell size={16} /></div>
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

const pillStyle: React.CSSProperties = { fontSize: 11, padding: "6px 8px", borderRadius: 8, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)" };
