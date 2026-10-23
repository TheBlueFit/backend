"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Dumbbell, Image as ImageIcon, Target, TrendingDown, TrendingUp } from "lucide-react";
import ProgressChart from "@/components/shared/ProgressChart";
import MediaViewerModal from "@/components/shared/MediaViewerModal";
import { ClientProgress, dashboardAPI } from "@/services/api";

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
          <div className="section-header" style={{ marginBottom: 24, alignItems: "flex-end" }}>
            <div>
              <div className="label-text" style={{ color: "var(--text-secondary)", marginBottom: 6, letterSpacing: "0.16em" }}>PROGRESS REVIEW</div>
              <h1 className="animated-gradient-text" style={{ fontSize: 30, textTransform: "none", marginBottom: 6 }}>{data.client.name}</h1>
              <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                Goal: {data.client.goal} · {data.summary.totalCheckins} check-in{data.summary.totalCheckins === 1 ? "" : "s"} on record
              </span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
                  {weightData.length > 1 ? <ProgressChart data={weightData} dataKey="weight" unit="kg" color="#60A5FA" /> : (
                    <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 14 }}>Needs at least two check-ins to draw a trend.</p>
                  )}
                </section>
                <section className="app-card" style={{ padding: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><Target size={16} /> Program adherence</h3>
                  {adherenceData.length > 1 ? <ProgressChart data={adherenceData} dataKey="score" unit="%" color="#00E27B" /> : (
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
                    <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.18)", borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 1.55, marginBottom: 14 }}>
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
                      <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "11px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 12 }}>
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
    <Suspense fallback={<div style={{ padding: 24, color: "white" }}>Loading progress…</div>}>
      <ProgressReviewContent />
    </Suspense>
  );
}
