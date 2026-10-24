"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  UserPlus,
  Activity,
  Calendar,
  Utensils,
  Upload,
  X,
  Image as ImageIcon,
  Zap,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dashboardAPI } from "@/services/api";
import WorkoutImageImport from "@/components/coach/WorkoutImageImport";
import { CATEGORIES, CategoryId, STARTERS, StarterTemplate, starterExercises } from "@/lib/exerciseLibrary";
import AssignTemplateModal from "@/components/coach/AssignTemplateModal";
import MediaViewerModal from "@/components/shared/MediaViewerModal";

export default function PlanTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showImport, setShowImport] = useState(false);
  const [showStarters, setShowStarters] = useState(false);
  const [starterCat, setStarterCat] = useState<CategoryId>("STRENGTH");
  const [startingId, setStartingId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [imageTarget, setImageTarget] = useState<{
    key: string;
    title: string;
  } | null>(null);

  const fetchTemplates = async () => {
    try {
      const data = await dashboardAPI.getCoachTemplates();
      setTemplates(data.templates);
    } catch (e) {
      console.error("Failed to fetch templates:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const created = await dashboardAPI.createTemplate({
        title: "New Template",
      });

      router.push(
        `/coach/templates/edit?id=${encodeURIComponent(created.id)}`
      );
    } catch (err: any) {
      setError(err.message || "Could not create a template.");
      setIsCreating(false);
    }
  };

  const useStarter = async (st: StarterTemplate) => {
    setStartingId(st.id);
    setError(null);
    try {
      const created = await dashboardAPI.createTemplate({
        title: st.title, description: st.description, goal: st.goal, level: st.level,
        workoutDays: st.workoutDays, estimatedDuration: st.estimatedDuration, equipment: st.equipment,
        exercises: starterExercises(st),
      });
      router.push(`/coach/templates/edit?id=${encodeURIComponent(created.id)}`);
    } catch (err: any) {
      setError(err.message || "Could not create this template.");
      setStartingId(null);
    }
  };

  const handleImportSaved = (created: any[]) => {
    setShowImport(false);
    if (created?.length) fetchTemplates(); // reload so counts/fields match what the server saved
  };

  return (
    <>
      {/* Image viewer modal */}
      {imageTarget && (
        <MediaViewerModal
          objectKey={imageTarget.key}
          title={imageTarget.title}
          onClose={() => setImageTarget(null)}
        />
      )}

      {/* Assign modal */}
      {assignTarget && (
        <AssignTemplateModal
          templateId={assignTarget.id}
          templateTitle={assignTarget.title}
          onClose={() => setAssignTarget(null)}
        />
      )}

      <div className="container" style={{ maxWidth: "800px" }}>
        <div className="app-card fade-in">
          {/* Header Row */}
          <div
            className="section-header"
            style={{
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "28px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "36px",
                  fontWeight: "bold",
                  margin: "0 0 8px 0",
                  lineHeight: "1.2",
                }}
              >
                <span style={{ color: "var(--accent-gold)" }}>Plan</span>
                <br />
                <span className="animated-gradient-text">Templates</span>
              </h1>

              <p
                className="label-text"
                style={{
                  textTransform: "none",
                  color: "var(--text-secondary)",
                  letterSpacing: "0",
                  fontSize: "14px",
                  margin: 0,
                }}
              >
                Build and manage reusable workout frameworks.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                alignItems: "flex-end",
              }}
            >
              <button
                onClick={() => setShowStarters((v) => !v)}
                style={{ padding: "10px 14px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", background: showStarters ? "rgb(var(--green-rgb) / 0.2)" : "rgb(var(--green-rgb) / 0.1)", color: "var(--accent-green)", border: "1px solid rgb(var(--green-rgb) / 0.4)", borderRadius: "8px", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {showStarters ? <X size={14} /> : <Sparkles size={14} />}
                {showStarters ? "CLOSE SAMPLES" : "START FROM A SAMPLE"}
              </button>

              {/* Import existing workout template */}
              <button
                onClick={() => setShowImport((v) => !v)}
                style={{
                  padding: "10px 14px",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: showImport
                    ? "rgb(var(--gold-rgb) / 0.2)"
                    : "rgb(var(--gold-rgb) / 0.1)",
                  color: "var(--accent-gold)",
                  border: "1px solid rgb(var(--gold-rgb) / 0.4)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {showImport ? <X size={14} /> : <Upload size={14} />}
                {showImport ? "CANCEL IMPORT" : "IMPORT TEMPLATE"}
              </button>

              {/* Manual create */}
              <button
                onClick={handleCreate}
                disabled={isCreating}
                style={{
                  padding: "10px 14px",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgb(var(--blue-rgb) / 0.15)",
                  color: "var(--blue)",
                  border: "1px solid rgb(var(--blue-rgb) / 0.4)",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                <Plus size={14} />
                {isCreating ? "CREATING…" : "NEW TEMPLATE"}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="error-banner"
              style={{ marginBottom: "20px" }}
            >
              {error}
            </div>
          )}

          {/* Import panel */}
          {showImport && (
            <div
              style={{
                marginBottom: "28px",
                padding: "24px",
                background: "rgb(var(--gold-rgb) / 0.04)",
                border: "1px solid rgb(var(--gold-rgb) / 0.2)",
                borderRadius: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "20px",
                }}
              >
                <Upload size={18} color="var(--accent-gold)" />

                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  Import Workout Templates (JSON)
                </h3>
              </div>

              <WorkoutImageImport
                onSaved={handleImportSaved}
                onCancel={() => setShowImport(false)}
              />
            </div>
          )}

          {/* Sample templates */}
          {showStarters && (
            <div style={{ marginBottom: "28px", padding: "20px", background: "rgb(var(--green-rgb) / 0.04)", border: "1px solid rgb(var(--green-rgb) / 0.2)", borderRadius: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px" }}>Sample templates</h3>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 14px" }}>Pick a starting point. It opens in the editor, where you can swap variations, reorder and edit everything for your client.</p>
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "14px" }}>
                {CATEGORIES.map((c) => (
                  <button key={c.id} type="button" onClick={() => setStarterCat(c.id)}
                    style={{ flex: "0 0 auto", padding: "8px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid var(--border-subtle)", background: starterCat === c.id ? "var(--text-primary)" : "transparent", color: starterCat === c.id ? "var(--bg-app)" : "var(--text-primary)" }}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {STARTERS.filter((st) => st.category === starterCat).map((st) => (
                  <div key={st.id} style={{ padding: "14px", borderRadius: "12px", border: "1px solid var(--border-subtle)", background: "rgb(var(--ink-rgb) / 0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: "14px" }}>{st.title}</strong>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>{st.level} · {st.workoutDays} · {st.estimatedDuration} · {st.equipment}</div>
                      </div>
                      <button type="button" disabled={startingId !== null} onClick={() => useStarter(st)} className="btn-primary" style={{ padding: "8px 14px", fontSize: "11px", flex: "none", opacity: startingId && startingId !== st.id ? 0.5 : 1 }}>
                        {startingId === st.id ? "Creating…" : "Use this"}
                      </button>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "8px 0" }}>{st.description}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {st.names.map((n) => <span key={n} style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "999px", background: "rgb(var(--ink-rgb) / 0.06)" }}>{n}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Template Cards */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {isLoading ? (
              <div
                style={{
                  padding: "48px",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                Loading Templates…
              </div>
            ) : templates.length === 0 ? (
              <div
                style={{
                  padding: "48px",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                <Activity
                  size={32}
                  style={{ marginBottom: "12px", opacity: 0.3 }}
                />

                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                  }}
                >
                  No templates yet. Create one manually or import a template.
                </p>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  style={{
                    background: "rgb(var(--ink-rgb) / 0.03)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgb(var(--ink-rgb) / 0.08)",
                    borderRadius: "16px",
                    padding: "22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {/* Title + actions row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "17px",
                          fontWeight: "bold",
                          color: "var(--text-primary)",
                          margin: "0 0 4px",
                        }}
                      >
                        {template.title}
                      </h3>

                      {template.description && (
                        <p
                          style={{
                            fontSize: "13px",
                            color: "var(--text-secondary)",
                            lineHeight: "1.5",
                            margin: 0,
                          }}
                        >
                          {template.description}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexShrink: 0,
                      }}
                    >
                      {/* View reference image */}
                      {template.referenceImageKey && (
                        <button
                          onClick={() =>
                            setImageTarget({
                              key: template.referenceImageKey,
                              title: template.title,
                            })
                          }
                          title="View reference image"
                          style={{
                            background: "rgb(var(--gold-rgb) / 0.1)",
                            border:
                              "1px solid rgb(var(--gold-rgb) / 0.3)",
                            borderRadius: "8px",
                            color: "var(--accent-gold)",
                            cursor: "pointer",
                            padding: "7px",
                            display: "flex",
                          }}
                        >
                          <ImageIcon size={15} />
                        </button>
                      )}

                      {/* Edit */}
                      <Link
                        href={`/coach/templates/edit?id=${encodeURIComponent(
                          template.id
                        )}`}
                        style={{
                          background: "rgb(var(--ink-rgb) / 0.06)",
                          border:
                            "1px solid rgb(var(--ink-rgb) / 0.1)",
                          borderRadius: "8px",
                          color: "var(--text-secondary)",
                          padding: "7px",
                          display: "flex",
                          textDecoration: "none",
                        }}
                      >
                        <Edit2 size={15} />
                      </Link>

                      {/* Assign */}
                      <button
                        onClick={() =>
                          setAssignTarget({
                            id: template.id,
                            title: template.title,
                          })
                        }
                        title="Assign to client"
                        style={{
                          background: "rgb(var(--green-rgb) / 0.1)",
                          border:
                            "1px solid rgb(var(--green-rgb) / 0.3)",
                          borderRadius: "8px",
                          color: "var(--accent-green)",
                          cursor: "pointer",
                          padding: "7px",
                          display: "flex",
                        }}
                      >
                        <UserPlus size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Attributes */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      padding: "14px",
                      background: "rgb(var(--well-rgb) / 0.2)",
                      borderRadius: "12px",
                    }}
                  >
                    {template.activities && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Activity size={13} color="var(--accent-green)" />
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {template.activities}
                        </span>
                      </div>
                    )}

                    {template.workoutDays && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Calendar size={13} color="var(--blue)" />
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {template.workoutDays}
                        </span>
                      </div>
                    )}

                    {template.goal && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Utensils size={13} color="var(--accent-gold)" />
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Goal: {template.goal}
                        </span>
                      </div>
                    )}

                    {template.level && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Zap size={13} color="#A78BFA" />
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {template.level}
                        </span>
                      </div>
                    )}

                    {template.estimatedDuration && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Clock size={13} color="#F472B6" />
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {template.estimatedDuration}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Assign CTA */}
                  <button
                    onClick={() =>
                      setAssignTarget({
                        id: template.id,
                        title: template.title,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "13px",
                      background: "rgb(var(--green-rgb) / 0.08)",
                      border:
                        "1px solid rgb(var(--green-rgb) / 0.25)",
                      borderRadius: "10px",
                      color: "var(--accent-green)",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <UserPlus size={14} />
                    ASSIGN TO CLIENT
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}