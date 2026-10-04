"use client";
/**
 * ScheduleModal
 * ─────────────
 * Opens a schedule (assigned workout) as a full-screen in-app modal.
 * The reference image (if any) is rendered inside the same modal via a
 * presigned S3 URL — never opening a raw browser tab.
 *
 * Used by:
 *   - Client dashboard  → tap "View Schedule"
 *   - Coach client view → tap "View Client Schedule"
 */

import React, { useEffect, useState } from "react";
import {
  X, Dumbbell, Calendar, Target, Zap, Clock, Package,
  StickyNote, Image as ImageIcon, ChevronDown, ChevronUp,
  CheckCircle2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Exercise {
  order?: number;
  name: string;
  sets: string | number;
  reps: string | number;
  rest?: string;
  tempo?: string;
  weight?: string;
  rpe?: string | number;
  notes?: string;
}

export interface Schedule {
  assignmentId: string;
  templateTitle: string;
  startDate: string;
  goal?: string;
  level?: string;
  estimatedDuration?: string;
  equipment?: string;
  workoutDays?: string;
  notes?: string;
  exercises: Exercise[];
  referenceImageUrl?: string | null;
  status?: string;
}

interface Props {
  schedule: Schedule;
  onClose: () => void;
}

// ── Exercise Card ──────────────────────────────────────────────────────────────
function ExerciseCard({ ex, index }: { ex: Exercise; index: number }) {
  const [open, setOpen] = useState(false);
  const chips = [
    ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : null,
    ex.rest ? `Rest ${ex.rest}` : null,
    ex.rpe ? `RPE ${ex.rpe}` : null,
    ex.tempo ? `Tempo ${ex.tempo}` : null,
    ex.weight ? ex.weight : null,
  ].filter(Boolean) as string[];

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: "14px",
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      {/* Row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", cursor: "pointer" }}
      >
        <div
          style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "rgba(229,184,105,0.15)", border: "1px solid rgba(229,184,105,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, fontSize: "13px", fontWeight: 700, color: "#E5B869",
          }}
        >
          {index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#fff", margin: "0 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {ex.name}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {chips.map(chip => (
              <span key={chip} style={{ fontSize: "11px", padding: "2px 8px", background: "rgba(255,255,255,0.07)", borderRadius: "20px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                {chip}
              </span>
            ))}
          </div>
        </div>
        {ex.notes
          ? (open ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />)
          : null}
      </div>
      {/* Notes */}
      {open && ex.notes && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.6" }}>{ex.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Info Row ───────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
      <div style={{ marginTop: "2px" }}><Icon size={15} color="#E5B869" /></div>
      <div>
        <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 2px", fontWeight: 600 }}>{label}</p>
        <p style={{ fontSize: "14px", color: "#fff", margin: 0, fontWeight: 500 }}>{value}</p>
      </div>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
export default function ScheduleModal({ schedule, onClose }: Props) {
  const [showImage, setShowImage] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }); }
    catch { return d; }
  };

  return (
    <>
      {/* ── Overlay ── */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      />

      {/* ── Panel ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 901,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "env(safe-area-inset-top, 16px) 0 0",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "680px",
            maxHeight: "calc(100vh - env(safe-area-inset-top, 16px))",
            background: "rgba(14,14,22,0.97)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "24px 24px 0 0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            pointerEvents: "auto",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: "16px" }}>
              <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#E5B869", margin: "0 0 4px", fontWeight: 700 }}>Your Schedule</p>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#fff", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {schedule.templateTitle}
              </h2>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                Starts {formatDate(schedule.startDate)}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close schedule"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", cursor: "pointer", padding: "8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ overflowY: "auto", flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}>

            {/* Meta grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", padding: "18px", background: "rgba(255,255,255,0.03)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <InfoRow icon={Target} label="Goal" value={schedule.goal || ""} />
              <InfoRow icon={Zap} label="Level" value={schedule.level || ""} />
              <InfoRow icon={Clock} label="Duration" value={schedule.estimatedDuration || ""} />
              <InfoRow icon={Calendar} label="Frequency" value={schedule.workoutDays || ""} />
              <InfoRow icon={Package} label="Equipment" value={schedule.equipment || ""} />
              {schedule.notes && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <InfoRow icon={StickyNote} label="Coach Notes" value={schedule.notes} />
                </div>
              )}
            </div>

            {/* Reference image toggle */}
            {schedule.referenceImageUrl && (
              <div style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                <button
                  onClick={() => setShowImage(v => !v)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: "none", cursor: "pointer", color: "#fff" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <ImageIcon size={16} color="#E5B869" />
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>Reference Workout Image</span>
                  </div>
                  {showImage ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
                </button>
                {showImage && (
                  <div style={{ background: "#000", maxHeight: "360px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img
                      src={schedule.referenceImageUrl}
                      alt="Reference workout"
                      style={{ maxWidth: "100%", maxHeight: "360px", objectFit: "contain" }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Exercises */}
            {schedule.exercises.length > 0 && (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", margin: "0 0 12px" }}>
                  Exercises — {schedule.exercises.length}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {schedule.exercises.map((ex, i) => (
                    <ExerciseCard key={i} ex={ex} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {schedule.exercises.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px", color: "var(--text-secondary)" }}>
                <Dumbbell size={32} style={{ marginBottom: "12px", opacity: 0.4 }} />
                <p style={{ fontSize: "14px", margin: 0 }}>No exercises have been added to this schedule yet.</p>
              </div>
            )}

          </div>

          {/* Footer */}
          <div
            style={{
              padding: "14px 20px calc(14px + env(safe-area-inset-bottom, 0px))",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
              display: "flex",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
              <CheckCircle2 size={14} color="#00E27B" />
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Schedule active · {schedule.exercises.length} exercises
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: "10px 24px", background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px",
                color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600,
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
