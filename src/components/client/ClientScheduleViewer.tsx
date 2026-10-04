"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface Props { assignmentId: string; title?: string; onClose: () => void; }

export default function ClientScheduleViewer({ assignmentId, title, onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const src = `/client/schedules/view?assignmentId=${encodeURIComponent(assignmentId)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ? `${title} schedule` : "Workout schedule"}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
    >
      <div style={{ width: "min(1100px,100%)", height: "min(88vh,820px)", display: "flex", flexDirection: "column", background: "#070707", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, overflow: "hidden", boxShadow: "0 30px 100px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 12px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.12em", textTransform: "uppercase" }}>ASSIGNED WORKOUT</div>
            <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Workout Schedule"}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close workout schedule" style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}><X size={18} /></button>
        </div>
        <iframe title={title ? `${title} schedule` : "Workout schedule"} src={src} style={{ border: 0, width: "100%", flex: 1, background: "#050505" }} />
      </div>
    </div>
  );
}
