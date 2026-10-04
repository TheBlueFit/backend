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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dashboardAPI } from "@/services/api";
import WorkoutImageImport from "@/components/coach/WorkoutImageImport";
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

  const handleImportSaved = (template: any) => {
    setShowImport(false);
    setTemplates((prev) => [template, ...prev]);
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
                <span style={{ color: "#E5B869" }}>Plan</span>
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
                    ? "rgba(229,184,105,0.2)"
                    : "rgba(229,184,105,0.1)",
                  color: "#E5B869",
                  border: "1px solid rgba(229,184,105,0.4)",
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
                  background: "rgba(0,122,255,0.15)",
                  color: "#60A5FA",
                  border: "1px solid rgba(0,122,255,0.4)",
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
                background: "rgba(229,184,105,0.04)",
                border: "1px solid rgba(229,184,105,0.2)",
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
                <Upload size={18} color="#E5B869" />

                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#fff",
                    margin: 0,
                  }}
                >
                  Import Workout Template
                </h3>
              </div>

              <WorkoutImageImport
                onSaved={handleImportSaved}
                onCancel={() => setShowImport(false)}
              />
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
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.08)",
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
                          color: "#fff",
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
                            background: "rgba(229,184,105,0.1)",
                            border:
                              "1px solid rgba(229,184,105,0.3)",
                            borderRadius: "8px",
                            color: "#E5B869",
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
                          background: "rgba(255,255,255,0.06)",
                          border:
                            "1px solid rgba(255,255,255,0.1)",
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
                          background: "rgba(0,226,123,0.1)",
                          border:
                            "1px solid rgba(0,226,123,0.3)",
                          borderRadius: "8px",
                          color: "#00E27B",
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
                      background: "rgba(0,0,0,0.2)",
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
                        <Activity size={13} color="#00E27B" />
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
                        <Calendar size={13} color="#60A5FA" />
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
                        <Utensils size={13} color="#E5B869" />
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
                      background: "rgba(0,226,123,0.08)",
                      border:
                        "1px solid rgba(0,226,123,0.25)",
                      borderRadius: "10px",
                      color: "#00E27B",
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