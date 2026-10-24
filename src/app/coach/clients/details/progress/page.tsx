"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Droplets, Dumbbell, Footprints, Image as ImageIcon, MessageSquare, Moon, Target, TrendingDown, TrendingUp, User } from "lucide-react";
import ProgressChart from "@/components/shared/ProgressChart";
import MediaViewerModal from "@/components/shared/MediaViewerModal";
import { ClientProgress, dashboardAPI } from "@/services/api";
import { fmtNum, timeAgo } from "@/lib/format";

const ADHERENCE_LABEL: Record<string, string> = {
  strict: "Strictly followed the plan",
  mostly: "Mostly on plan",
  struggled: "Struggled this week",
};
const QUALITY_LABEL: Record<string, string> = {
  strong: "Strong — progressing",
  maintained: "Maintained",
  weak: "Weak — needs attention",
};

const ACTIVITY_LABEL: Record<string, string> = {
  sedentary: "Sedentary", light: "Lightly active", moderate: "Moderately active", active: "Very active", athlete: "Athlete",
};
const GOAL_LABEL: Record<string, string> = {
  fat_loss: "Fat loss", hypertrophy: "Muscle hypertrophy", maintenance: "Maintenance", strength: "Strength", endurance: "Endurance",
};

const card: React.CSSProperties = { padding: 20 };

function Fact({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="label-text" style={{ fontSize: 10, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, wordBreak: "break-word" }}>{value === undefined || value === null || value === "" ? "—" : value}</div>
    </div>
  );
}

function Metric({ label, icon: Icon, color, value, unit, sub, progress }: { label: string; icon: React.ElementType; color: string; value: string; unit?: string; sub?: string; progress?: number | null }) {
  return (
    <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="label-text" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}><Icon size={13} color={color} /> {label}</span>
      <span style={{ fontSize: 24, fontWeight: 700 }}>{value}{unit && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginLeft: 5 }}>{unit}</span>}</span>
      {progress != null && (
        <div style={{ height: 5, borderRadius: 999, background: "rgb(var(--ink-rgb) / 0.08)", overflow: "hidden" }}>
          <div style={{ width: `${Math.max(0, Math.min(100, progress))}%`, height: "100%", background: color, borderRadius: 999 }} />
        </div>
      )}
      {sub && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{sub}</span>}
    </div>
  );
}

const tile: React.CSSProperties = {
  background: "var(--bg-input)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

function shortDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ProgressReviewContent() {
  const params = useSearchParams();
  const clientId = params.get("id") || "";
  const [data, setData] = useState<ClientProgress | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewer, setViewer] = useState<{ objectKey: string; title: string } | null>(null);

  useEffect(() => {
    if (!clientId) {
      setError("No client selected. Open a client from your roster.");
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError("");
    dashboardAPI
      .getClientProgress(clientId)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err: any) => { if (!cancelled) setError(err?.message || "Could not load progress."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [clientId]);

  const weightData = useMemo(
    () => (data?.checkins ?? []).filter((c) => c.weight != null).map((c) => ({ date: shortDate(c.date), weight: Number(c.weight) })),
    [data]
  );
  const adherenceData = useMemo(
    () => (data?.checkins ?? []).filter((c) => c.adherenceScore != null).map((c) => ({ date: shortDate(c.date), score: Number(c.adherenceScore) })),
    [data]
  );

  const health = useMemo(() => (data?.health ?? []).map((h) => ({
    date: shortDate(h.date), steps: h.steps ?? null, sleep: h.sleepHours ?? null, water: h.hydration ?? null,
  })), [data]);
  const hasSteps = health.some((h) => h.steps != null);
  const hasSleep = health.some((h) => h.sleep != null);
  const hasWater = health.some((h) => h.water != null);
  const a = data?.activity;
  const p = data?.profile;
  const goalSteps = a?.stepGoal ?? 10000;

  const latest = data?.checkins?.length ? data.checkins[data.checkins.length - 1] : null;
  const earlier = data ? [...data.checkins].slice(0, -1).reverse() : [];
  const change = data?.summary.weightChange ?? null;

  return (
    <div className="container" style={{ maxWidth: 1000, paddingBottom: 60 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <Link
          href={clientId ? `/coach/clients/details?id=${encodeURIComponent(clientId)}` : "/coach/clients"}
          className="btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none" }}
        >
          <ArrowLeft size={14} /> Back to client
        </Link>
      </div>

      {isLoading ? (
        <div className="app-card" style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>Loading progress…</div>
      ) : error || !data ? (
        <div className="error-banner">{error || "Progress is unavailable."}</div>
      ) : (
        <>
          <div className="section-header" style={{ marginBottom: 24, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <div className="label-text" style={{ color: "var(--text-secondary)", marginBottom: 6, letterSpacing: "0.16em" }}>PROGRESS REVIEW</div>
              <h1 className="animated-gradient-text" style={{ fontSize: 30, textTransform: "none", marginBottom: 6 }}>{data.client.name}</h1>
              <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                Goal: {data.client.goal} · {data.summary.totalCheckins} check-in{data.summary.totalCheckins === 1 ? "" : "s"} on record
              </span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link
                href={`/coach/messages?client=${encodeURIComponent(clientId)}`}
                className="btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none" }}
              >
                <MessageSquare size={14} /> Message
              </Link>
              <Link
                href={`/coach/clients/check-status?clientId=${encodeURIComponent(clientId)}`}
                className="btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none" }}
              >
                <ClipboardList size={14} /> Check status
              </Link>
              <Link
                href="/coach/templates"
                className="btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none" }}
              >
                <Dumbbell size={14} /> Adjust plan
              </Link>
            </div>
          </div>

          <section className="app-card" style={{ ...card, marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><User size={16} color="var(--blue)" /> Client profile</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 18 }}>
              <Fact label="Email" value={p?.email} />
              <Fact label="Age" value={p?.age != null ? `${p.age} yrs` : "—"} />
              <Fact label="Height" value={p?.height != null ? `${p.height} cm` : "—"} />
              <Fact label="Starting weight" value={p?.startWeight != null ? `${p.startWeight} kg` : "—"} />
              <Fact label="Activity level" value={p?.activityLevel ? ACTIVITY_LABEL[p.activityLevel] ?? p.activityLevel : "—"} />
              <Fact label="Primary goal" value={p?.primaryGoal ? GOAL_LABEL[p.primaryGoal] ?? p.primaryGoal : data.client.goal} />
              <Fact label="Member since" value={p?.memberSince ? shortDate(p.memberSince) : "—"} />
              <Fact label="Setup" value={p?.onboardingCompleted ? "Completed" : "Pending"} />
            </div>
            {p?.medicalNotes && (
              <div style={{ marginTop: 16, padding: 14, borderRadius: 12, fontSize: 13, lineHeight: 1.55, background: "rgb(var(--gold-rgb) / 0.08)", border: "1px solid rgb(var(--gold-rgb) / 0.25)" }}>
                <div className="label-text" style={{ fontSize: 10, marginBottom: 6, color: "var(--accent-gold)" }}>MEDICAL NOTES / LIMITATIONS</div>{p.medicalNotes}
              </div>
            )}
          </section>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 8 }}>
            <Metric label="Steps (latest)" icon={Footprints} color="var(--accent-green)" value={fmtNum(a?.stepsLatest)} unit={`/ ${fmtNum(goalSteps)}`} progress={a?.stepsLatest != null ? (a.stepsLatest / goalSteps) * 100 : null} sub={a?.stepsLatest == null ? "No steps logged yet" : `7-day avg ${fmtNum(a?.stepsAvg7d)}`} />
            <Metric label="Sleep (7d avg)" icon={Moon} color="var(--blue)" value={a?.sleepAvg7d != null ? fmtNum(a.sleepAvg7d, 1) : "—"} unit={a?.sleepAvg7d != null ? "h" : undefined} sub="Target 8h" />
            <Metric label="Water (7d avg)" icon={Droplets} color="var(--blue)" value={a?.hydrationAvg7d != null ? fmtNum(a.hydrationAvg7d, 1) : "—"} unit={a?.hydrationAvg7d != null ? "L" : undefined} sub="Target 3L" />
            <Metric label="Workouts (7d)" icon={Dumbbell} color="var(--accent-gold)" value={a?.workoutsPlanned7d ? `${a.workoutsDone7d}/${a.workoutsPlanned7d}` : "—"} progress={a?.workoutsCompletion7d ?? null} sub={a?.workoutsCompletion7d != null ? `${a.workoutsCompletion7d}% completed` : "Nothing planned"} />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 4px 16px" }}>
            {a?.lastSyncAt ? `Health data last updated ${timeAgo(a.lastSyncAt)}${a.source ? ` · source: ${a.source === "manual" ? "entered by client" : a.source}` : ""}.` : "The client has not logged any steps, sleep or water yet."}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
            <section className="app-card" style={card}>
              <h3 style={{ margin: 0, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><Footprints size={16} color="var(--accent-green)" /> Steps · last 14 days</h3>
              {hasSteps ? <ProgressChart data={health} dataKey="steps" label="Steps" variant="bar" color="var(--accent-green)" goal={goalSteps} zeroBased /> : <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 14 }}>No step data yet.</p>}
            </section>
            <section className="app-card" style={card}>
              <h3 style={{ margin: 0, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><Moon size={16} color="var(--blue)" /> Sleep · last 14 days</h3>
              {hasSleep ? <ProgressChart data={health} dataKey="sleep" label="Sleep" unit="h" color="var(--blue)" goal={8} zeroBased /> : <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 14 }}>No sleep data yet.</p>}
            </section>
          </div>
          {hasWater && (
            <section className="app-card" style={{ ...card, marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><Droplets size={16} color="var(--blue)" /> Water · last 14 days</h3>
              <ProgressChart data={health} dataKey="water" label="Water" unit="L" variant="bar" color="var(--blue)" goal={3} zeroBased height={200} />
            </section>
          )}

          {!data.checkins.length ? (
            <div className="app-card" style={{ padding: 36, textAlign: "center", color: "var(--text-secondary)" }}>
              {data.client.name} hasn&apos;t submitted a weekly check-in yet. Progress charts appear after the first one.
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
                <div style={tile}>
                  <span className="label-text" style={{ fontSize: 11 }}>Weight change</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: change == null ? "var(--text-primary)" : change <= 0 ? "var(--accent-green)" : "var(--accent-gold)", display: "flex", alignItems: "center", gap: 8 }}>
                    {change == null ? "—" : <>{change <= 0 ? <TrendingDown size={18} /> : <TrendingUp size={18} />}{change > 0 ? "+" : ""}{change} kg</>}
                  </span>
                </div>
                <div style={tile}>
                  <span className="label-text" style={{ fontSize: 11 }}>Average adherence</span>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>{data.summary.averageAdherence != null ? `${data.summary.averageAdherence}%` : "—"}</span>
                </div>
                <div style={tile}>
                  <span className="label-text" style={{ fontSize: 11 }}>Latest weight</span>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>{latest?.weight != null ? `${latest.weight} kg` : "—"}</span>
                </div>
                <div style={tile}>
                  <span className="label-text" style={{ fontSize: 11 }}>Latest waist</span>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>{latest?.waist != null ? `${latest.waist} cm` : "—"}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 24 }}>
                <section className="app-card" style={{ padding: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><TrendingDown size={16} /> Body weight</h3>
                  {weightData.length > 1 ? <ProgressChart data={weightData} dataKey="weight" unit="kg" color="var(--blue)" /> : (
                    <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 14 }}>Needs at least two check-ins to draw a trend.</p>
                  )}
                </section>
                <section className="app-card" style={{ padding: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><Target size={16} /> Program adherence</h3>
                  {adherenceData.length > 1 ? <ProgressChart data={adherenceData} dataKey="score" unit="%" color="var(--accent-green)" /> : (
                    <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 14 }}>Needs at least two check-ins to draw a trend.</p>
                  )}
                </section>
              </div>

              {latest && (
                <section className="app-card" style={{ padding: 22, marginBottom: 24 }}>
                  <div className="label-text" style={{ marginBottom: 6, color: "var(--text-secondary)" }}>LATEST WEEKLY CHECK-IN · {shortDate(latest.date)}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, margin: "14px 0" }}>
                    <div style={tile}>
                      <span className="label-text" style={{ fontSize: 11 }}>Diet adherence</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{ADHERENCE_LABEL[latest.adherence ?? ""] ?? latest.adherence ?? "—"}</span>
                    </div>
                    <div style={tile}>
                      <span className="label-text" style={{ fontSize: 11 }}>Workout quality</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{QUALITY_LABEL[latest.workoutQuality ?? ""] ?? latest.workoutQuality ?? "—"}</span>
                    </div>
                  </div>
                  {latest.notes && (
                    <div style={{ background: "rgb(var(--blue-rgb) / 0.06)", border: "1px solid rgb(var(--blue-rgb) / 0.18)", borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 1.55, marginBottom: 14 }}>
                      <div className="label-text" style={{ fontSize: 10, marginBottom: 6, color: "var(--text-secondary)" }}>CLIENT NOTES</div>
                      “{latest.notes}”
                    </div>
                  )}
                  <div className="label-text" style={{ fontSize: 10, marginBottom: 8, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}><ImageIcon size={13} /> PROGRESS PHOTOS</div>
                  {latest.photos.length ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {latest.photos.map((photo) => (
                        <button
                          key={photo.objectKey}
                          type="button"
                          className="btn-secondary"
                          style={{ display: "inline-flex", alignItems: "center", gap: 7, textTransform: "capitalize" }}
                          onClick={() => setViewer({ objectKey: photo.objectKey, title: `${data.client.name} · ${photo.angle} · ${shortDate(latest.date)}` })}
                        >
                          <ImageIcon size={14} /> {photo.angle} photo
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>No photos were attached to this check-in.</span>
                  )}
                </section>
              )}

              {earlier.length > 0 && (
                <section className="app-card" style={{ padding: 22 }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Earlier check-ins</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {earlier.map((c) => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "11px 14px", borderRadius: 12, background: "rgb(var(--ink-rgb) / 0.03)", border: "1px solid rgb(var(--ink-rgb) / 0.06)", fontSize: 12 }}>
                        <span style={{ fontWeight: 600 }}>{shortDate(c.date)}</span>
                        <span style={{ color: "var(--text-secondary)" }}>
                          {c.weight != null ? `${c.weight} kg` : "—"} · {ADHERENCE_LABEL[c.adherence ?? ""] ?? "—"} · {QUALITY_LABEL[c.workoutQuality ?? ""] ?? "—"}
                        </span>
                        {c.photos.length > 0 && (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "5px 10px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 6 }}
                            onClick={() => setViewer({ objectKey: c.photos[0].objectKey, title: `${data.client.name} · ${c.photos[0].angle} · ${shortDate(c.date)}` })}
                          >
                            <ImageIcon size={12} /> {c.photos.length} photo{c.photos.length === 1 ? "" : "s"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {viewer && <MediaViewerModal objectKey={viewer.objectKey} title={viewer.title} onClose={() => setViewer(null)} />}
    </div>
  );
}

export default function ClientProgressView() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "var(--text-primary)" }}>Loading progress…</div>}>
      <ProgressReviewContent />
    </Suspense>
  );
}
