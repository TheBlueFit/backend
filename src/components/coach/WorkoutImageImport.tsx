"use client";

import React, { useRef, useState } from "react";
import { CheckCircle2, FileJson, Plus, Trash2, Upload, X } from "lucide-react";
import { dashboardAPI } from "@/services/api";

interface Exercise {
  id?: string;
  order?: string | number;
  section?: string;
  type?: string;
  name: string;
  sets: string;
  reps: string;
  rest?: string;
  tempo?: string;
  weight?: string;
  rpe?: string;
  notes?: string;
}

interface Template {
  templateId?: string;
  title: string;
  description: string;
  goal: string;
  level: string;
  workoutDays: string;
  estimatedDuration: string;
  equipment: string;
  activities: string;
  referenceImageKey?: string;
  sourceImage?: string;
  parserVersion?: string;
  detectedLayout?: string;
  warnings?: string[];
  exercises: Exercise[];
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.35)",
  color: "#fff",
  padding: "9px 10px",
  fontSize: 12,
  outline: "none",
};

const emptyTemplate: Template = {
  title: "",
  description: "",
  goal: "",
  level: "",
  workoutDays: "",
  estimatedDuration: "",
  equipment: "",
  activities: "",
  exercises: [],
};

const textValue = (value: unknown) => (value == null ? "" : String(value));

export default function WorkoutImageImport({
  onSaved,
  onCancel,
}: {
  onSaved?: (template: any) => void;
  onCancel?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<"idle" | "review" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const readJson = async (file: File) => {
    setError("");
    try {
      const parsed = JSON.parse(await file.text());
      const exercises: Exercise[] = Array.isArray(parsed.exercises)
        ? parsed.exercises.map((e: any, index: number) => ({
            id: textValue(e.id || index + 1),
            order: e.order ?? index + 1,
            section: textValue(e.section),
            type: textValue(e.type),
            name: textValue(e.name),
            sets: textValue(e.sets),
            reps: textValue(e.reps),
            rest: textValue(e.rest),
            tempo: textValue(e.tempo),
            weight: textValue(e.weight),
            rpe: textValue(e.rpe),
            notes: textValue(e.notes),
          }))
        : [];

      setTemplate({
        ...emptyTemplate,
        ...parsed,
        templateId: textValue(parsed.templateId),
        title: textValue(parsed.title) || file.name.replace(/\.json$/i, ""),
        description: textValue(parsed.description),
        goal: textValue(parsed.goal),
        level: textValue(parsed.level),
        workoutDays: textValue(parsed.workoutDays),
        estimatedDuration: textValue(parsed.estimatedDuration),
        equipment: textValue(parsed.equipment),
        activities: textValue(parsed.activities) || `${exercises.length} Exercises`,
        sourceImage: textValue(parsed.sourceImage),
        referenceImageKey: textValue(parsed.referenceImageKey),
        parserVersion: textValue(parsed.parserVersion),
        detectedLayout: textValue(parsed.detectedLayout),
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(textValue) : [],
        exercises,
      });
      setFileName(file.name);
      setStep("review");
    } catch (err: any) {
      setError(err.message || "Could not read the template JSON.");
      setStep("error");
    }
  };

  const updateTemplate = (patch: Partial<Template>) =>
    setTemplate((current) => (current ? { ...current, ...patch } : current));

  const updateExercise = (index: number, patch: Partial<Exercise>) =>
    setTemplate((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.map((exercise, i) =>
              i === index ? { ...exercise, ...patch } : exercise
            ),
          }
        : current
    );

  const addExercise = () =>
    setTemplate((current) =>
      current
        ? {
            ...current,
            exercises: [
              ...current.exercises,
              {
                order: current.exercises.length + 1,
                section: "",
                type: "",
                name: "",
                sets: "3",
                reps: "8-12",
                rest: "",
                tempo: "",
                weight: "",
                rpe: "",
                notes: "",
              },
            ],
          }
        : current
    );

  const removeExercise = (index: number) =>
    setTemplate((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises
              .filter((_, i) => i !== index)
              .map((exercise, i) => ({ ...exercise, order: i + 1 })),
          }
        : current
    );

  const reset = () => {
    setTemplate(null);
    setFileName("");
    setError("");
    setStep("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const save = async () => {
    if (!template) return;

    if (!template.title.trim()) {
      setError("Template name is required.");
      return;
    }
    if (!template.exercises.length) {
      setError("Add at least one exercise before saving.");
      return;
    }
    if (template.exercises.some((exercise) => !exercise.name.trim())) {
      setError("Every exercise needs a name.");
      return;
    }

    setError("");
    setStep("saving");

    try {
      // Cast or pass 2nd argument depending on dashboardAPI.approveWorkoutTemplate definition
      const saved = await dashboardAPI.approveWorkoutTemplate(
        template.referenceImageKey || "",
        template
      );
      setStep("done");
      onSaved?.(saved?.template ?? saved);
    } catch (err: any) {
      setError(err.message || "Could not save template.");
      setStep("error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {step === "idle" && (
        <>
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              border: "2px dashed rgba(229,184,105,0.35)",
              borderRadius: 16,
              padding: "42px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: "rgba(229,184,105,0.03)",
            }}
          >
            <FileJson size={38} color="#E5B869" style={{ marginBottom: 12 }} />
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>
              Import reviewed workout JSON
            </div>
            <div
              style={{
                marginTop: 7,
                color: "var(--text-secondary)",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              Run the local deterministic image parser first, then select the generated
              JSON here for a final app-side review.
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readJson(file);
            }}
          />

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{ ...fieldStyle, background: "transparent", cursor: "pointer" }}
            >
              Cancel
            </button>
          )}
        </>
      )}

      {step === "error" && (
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: "rgba(255,69,58,0.07)",
            border: "1px solid rgba(255,69,58,0.25)",
          }}
        >
          <div style={{ color: "#FF453A", fontWeight: 700, fontSize: 14 }}>
            Import failed
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 8 }}>
            {error}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              type="button"
              onClick={reset}
              style={{ ...fieldStyle, width: "auto", cursor: "pointer" }}
            >
              Try again
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{ ...fieldStyle, width: "auto", cursor: "pointer" }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {(step === "review" || step === "saving" || step === "done") && template && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--text-secondary)",
                }}
              >
                LOCAL IMPORT REVIEW
              </div>
              <h3 style={{ margin: "5px 0 0", fontSize: 18 }}>{fileName}</h3>
              <div
                style={{
                  marginTop: 5,
                  color: "var(--text-secondary)",
                  fontSize: 11,
                }}
              >
                {template.detectedLayout
                  ? `Detected table layout ${template.detectedLayout}`
                  : "Deterministic parser output"}
                {template.parserVersion ? ` · ${template.parserVersion}` : ""}
              </div>
            </div>

            {step === "done" ? (
              <CheckCircle2 size={22} color="#00E27B" />
            ) : onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
                aria-label="Close import review"
              >
                <X size={20} />
              </button>
            ) : null}
          </div>

          {!!template.warnings?.length && (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: "rgba(229,184,105,0.06)",
                border: "1px solid rgba(229,184,105,0.18)",
                color: "var(--text-secondary)",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: "#E5B869" }}>
                Parser warnings — review before approval
              </strong>
              <div style={{ marginTop: 6 }}>
                {template.warnings.map((warning, index) => (
                  <div key={`${warning}-${index}`}>{warning}</div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: 10,
            }}
          >
            {[
              ["Template ID", "templateId"],
              ["Title", "title"],
              ["Goal", "goal"],
              ["Level", "level"],
              ["Workout days", "workoutDays"],
              ["Duration", "estimatedDuration"],
              ["Equipment", "equipment"],
            ].map(([label, key]) => (
              <label key={key} style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 6,
                  }}
                >
                  {label}
                </span>
                <input
                  disabled={step !== "review"}
                  value={(template as any)[key] || ""}
                  onChange={(event) =>
                    updateTemplate({ [key]: event.target.value } as any)
                  }
                  style={fieldStyle}
                />
              </label>
            ))}
          </div>

          <label style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 6,
              }}
            >
              Description
            </span>
            <textarea
              disabled={step !== "review"}
              value={template.description}
              onChange={(event) => updateTemplate({ description: event.target.value })}
              rows={3}
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Exercises ({template.exercises.length})
              </div>

              {step === "review" && (
                <button
                  type="button"
                  onClick={addExercise}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fff",
                    borderRadius: 9,
                    padding: "7px 10px",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  <Plus size={13} /> Add
                </button>
              )}
            </div>

            {template.exercises.map((exercise, index) => (
              <div
                key={String(exercise.id || index)}
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.025)",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
                    gap: 8,
                  }}
                >
                  {[
                    ["Section", "section"],
                    ["Type", "type"],
                    ["Exercise", "name"],
                    ["Sets", "sets"],
                    ["Reps / Time", "reps"],
                    ["Rest", "rest"],
                    ["Tempo", "tempo"],
                    ["Weight", "weight"],
                    ["RPE", "rpe"],
                    ["Notes", "notes"],
                  ].map(([label, key]) => (
                    <label
                      key={key}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gridColumn: key === "notes" ? "1 / -1" : undefined,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 5,
                        }}
                      >
                        {label}
                      </span>
                      <input
                        disabled={step !== "review"}
                        value={(exercise as any)[key] || ""}
                        onChange={(event) =>
                          updateExercise(index, { [key]: event.target.value } as any)
                        }
                        style={fieldStyle}
                      />
                    </label>
                  ))}
                </div>

                {step === "review" && (
                  <button
                    type="button"
                    onClick={() => removeExercise(index)}
                    style={{
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      color: "#FF453A",
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {error && <div style={{ color: "#FF453A", fontSize: 12 }}>{error}</div>}

          {step === "review" && (
            <div style={{ display: "flex", gap: 10 }}>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  style={{
                    flex: 1,
                    ...fieldStyle,
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={save}
                style={{
                  flex: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  border: "1px solid rgba(0,226,123,0.3)",
                  background: "rgba(0,226,123,0.08)",
                  color: "#00E27B",
                  borderRadius: 9,
                  padding: "11px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <Upload size={14} /> APPROVE & SAVE TEMPLATE
              </button>
            </div>
          )}

          {step === "saving" && (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 12 }}>
              Saving approved template…
            </div>
          )}

          {step === "done" && (
            <div style={{ color: "#00E27B", fontSize: 13, fontWeight: 700 }}>
              Template saved successfully.
            </div>
          )}
        </>
      )}
    </div>
  );
}