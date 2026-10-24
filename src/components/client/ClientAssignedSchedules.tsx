"use client";

import React, { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, Dumbbell, Loader2 } from "lucide-react";
import { dashboardAPI } from "@/services/api";
import ClientScheduleViewer from "./ClientScheduleViewer";

export default function ClientAssignedSchedules({ schedules }: { schedules?: any[] }) {
  const [items, setItems] = useState<any[]>(Array.isArray(schedules) ? schedules : []);
  const [loading, setLoading] = useState(!Array.isArray(schedules));
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    if (Array.isArray(schedules)) { setItems(schedules); setLoading(false); return; }
    let cancelled = false;
    dashboardAPI.getAthleteSchedules().then((data) => { if (!cancelled) setItems(data.schedules || []); }).catch(() => { if (!cancelled) setItems([]); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [schedules]);

  const humanDate = (value: string) => { if (!value) return ""; const d = new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); };

  return (
    <section className="app-card fade-in" style={{ marginTop: 24, flex: "none" }}>
      <div className="section-header" style={{ justifyContent: "space-between", marginBottom: 16 }}><div><h3 style={{ fontSize: 16, marginBottom: 5 }}>Assigned workout plans</h3><span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Open any assigned plan to view the full schedule.</span></div></div>
      {loading ? <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}><Loader2 size={16} className="animate-spin" style={{ marginRight: 6, verticalAlign: "middle" }} /> Loading schedules…</div> : !items.length ? <div style={{ padding: 22, textAlign: "center", color: "var(--text-secondary)", borderRadius: 14, background: "rgb(var(--ink-rgb) / 0.025)" }}>No workout plans have been assigned yet.</div> : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{items.map((schedule) => <button key={schedule.assignmentId} type="button" onClick={() => setSelected(schedule)} style={{ width: "100%", textAlign: "left", background: "rgb(var(--ink-rgb) / 0.03)", border: "1px solid rgb(var(--ink-rgb) / 0.08)", borderRadius: 14, padding: 14, color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}><span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "rgb(var(--blue-rgb) / 0.09)", color: "var(--blue)", flexShrink: 0 }}><Dumbbell size={16} /></span><span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{schedule.templateTitle || "Workout plan"}</span><span style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: 11, color: "var(--text-secondary)" }}><CalendarDays size={12} /> Starts {humanDate(schedule.startDate)}{schedule.goal ? ` · ${schedule.goal}` : ""}</span></span></span><span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--blue)", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>VIEW <ChevronRight size={15} /></span></button>)}</div>}
      {selected && <ClientScheduleViewer assignmentId={selected.assignmentId} title={selected.templateTitle} onClose={() => setSelected(null)} />}
    </section>
  );
}
