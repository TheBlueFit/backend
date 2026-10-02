"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
  Loader2,
  Save,
  Upload,
} from "lucide-react";
import {
  dashboardAPI,
  ThreeDayCheckStatus as CheckStatusData,
  ThreeDayDayStatus,
} from "@/services/api";

const DAYS = [1, 2, 3];
const MEALS = ["Breakfast", "Brunch", "Lunch", "Snacks", "Dinner"];

interface Props {
  mode: "CLIENT" | "COACH";
  clientId?: string;
}

function statusLabel(status: ThreeDayDayStatus["status"]) {
  if (status === "COMPLETE") return "Complete";
  if (status === "IN_PROGRESS") return "In progress";
  return "Not started";
}

function statusColor(status: ThreeDayDayStatus["status"]) {
  if (status === "COMPLETE") return "var(--accent-green)";
  if (status === "IN_PROGRESS") return "var(--accent-gold)";
  return "var(--text-secondary)";
}

export default function ThreeDayCheckStatus({ mode, clientId }: Props) {
  const [data, setData] = useState<CheckStatusData | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [meals, setMeals] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = mode === "CLIENT"
        ? await dashboardAPI.getClientCheckStatus()
        : await dashboardAPI.getCoachClientCheckStatus(clientId || "");
      setData(next);

      const day = next.days.find((item) => item.day === activeDay);
      setMeals(day?.meals ?? {});
    } catch (err: any) {
      setError(err?.message || "Unable to load check status.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "COACH" && !clientId) {
      setError("Client ID is required.");
      setIsLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, clientId]);

  const currentDay = useMemo(
    () => data?.days.find((item) => item.day === activeDay),
    [data, activeDay]
  );

  useEffect(() => {
    setMeals(currentDay?.meals ?? {});
  }, [currentDay]);

  const handleDayChange = (day: number) => {
    setActiveDay(day);
    const next = data?.days.find((item) => item.day === day);
    setMeals(next?.meals ?? {});
    setMessage(null);
    setError(null);
  };

  const saveDay = async () => {
    if (mode !== "CLIENT") return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await dashboardAPI.saveThreeDayLog(activeDay, meals);
      await load();
      setMessage(`Day ${activeDay} saved.`);
    } catch (err: any) {
      setError(err?.message || "Unable to save this day.");
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (day: number, meal: string, file: File | null) => {
    if (mode !== "CLIENT" || !file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Each photo must be 10 MB or smaller.");
      return;
    }

    const key = `${day}:${meal}`;
    setUploading((current) => ({ ...current, [key]: true }));
    setMessage(null);
    setError(null);

    try {
      const upload = await dashboardAPI.createThreeDayPhotoUpload({
        day,
        meal,
        fileName: file.name,
        contentType: file.type,
      });

      const form = new FormData();
      Object.entries(upload.fields).forEach(([name, value]) => {
        form.append(name, value);
      });
      form.append("file", file);

      const uploadResponse = await fetch(upload.uploadUrl, {
        method: "POST",
        body: form,
      });

      if (!uploadResponse.ok) {
        throw new Error("Photo upload failed.");
      }

      await dashboardAPI.completeThreeDayPhoto({
        day,
        meal,
        objectKey: upload.objectKey,
        originalFileName: file.name,
      });

      setSelectedFiles((current) => ({ ...current, [key]: null }));
      await load();
      setMessage(`${meal} photo saved.`);
    } catch (err: any) {
      setError(err?.message || "Unable to upload the photo.");
    } finally {
      setUploading((current) => ({ ...current, [key]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="app-card" style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
        Loading check status...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <section className="app-card" style={{ padding: 24 }}>
        <div className="section-header" style={{ marginBottom: 18 }}>
          <div>
            <div className="label-text" style={{ color: "var(--text-secondary)", marginBottom: 6 }}>
              {mode === "CLIENT" ? "ONBOARDING STATUS" : "CLIENT CHECK STATUS"}
            </div>
            <h2 className="animated-gradient-text" style={{ fontSize: 26, textTransform: "none", marginBottom: 6 }}>
              3-Day Log
            </h2>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 11 }}>
              Food entries are saved to the client record. Photos are optional and only visible to the client and authorized coach.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: statusColor(data.overallStatus) }}>
            {data.overallStatus === "COMPLETE" ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}
            <span>{statusLabel(data.overallStatus)}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          {data.days.map((day) => (
            <button
              key={day.day}
              type="button"
              onClick={() => handleDayChange(day.day)}
              className={activeDay === day.day ? "btn-primary" : "btn-secondary"}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 48, padding: "10px 12px" }}
            >
              <span>Day {day.day}</span>
              <span style={{ fontSize: 9, opacity: 0.82 }}>{statusLabel(day.status)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="app-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <div>
            <div className="label-text" style={{ color: "var(--text-secondary)" }}>DAY {activeDay}</div>
            <h3 style={{ margin: "7px 0 0", fontSize: 17 }}>Food entries & optional photos</h3>
          </div>
          {mode === "CLIENT" && (
            <button type="button" onClick={saveDay} disabled={saving} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
              {saving ? "Saving..." : "Save Day"}
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {MEALS.map((meal) => {
            const photo = currentDay?.photos.find((item) => item.meal === meal);
            const uploadKey = `${activeDay}:${meal}`;
            const busy = !!uploading[uploadKey];

            return (
              <div key={meal} style={{ padding: 14, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", background: "rgba(0,0,0,0.18)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", background: "rgba(104,207,168,0.08)", color: "#68cfa8" }}>
                      <Camera size={14} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{meal}</span>
                  </div>

                  {photo && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9, color: "var(--accent-green)" }}>
                      <Check size={12} /> Photo saved
                    </span>
                  )}
                </div>

                {mode === "CLIENT" ? (
                  <textarea
                    value={meals[meal] ?? ""}
                    onChange={(event) => setMeals((current) => ({ ...current, [meal]: event.target.value }))}
                    rows={2}
                    placeholder={`What did you have for ${meal.toLowerCase()}?`}
                    style={{ width: "100%", boxSizing: "border-box", resize: "vertical", padding: 12, background: "rgba(0,0,0,0.32)", border: "1px solid var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)", outline: "none", fontSize: 12 }}
                  />
                ) : (
                  <div style={{ padding: 12, borderRadius: 12, background: "rgba(0,0,0,0.28)", color: meals[meal] ? "var(--text-primary)" : "var(--text-secondary)", fontSize: 12, whiteSpace: "pre-wrap" }}>
                    {meals[meal] || "No food entry recorded."}
                  </div>
                )}

                <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  {mode === "CLIENT" ? (
                    <label className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.65 : 1 }}>
                      {busy ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                      {busy ? "Uploading..." : photo ? "Replace photo" : "Add optional photo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        disabled={busy}
                        style={{ display: "none" }}
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setSelectedFiles((current) => ({ ...current, [uploadKey]: file }));
                          if (file) uploadPhoto(activeDay, meal, file);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  ) : null}

                  {photo && photo.viewUrl ? (
                    <a href={photo.viewUrl} target="_blank" rel="noreferrer" className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
                      <ImageIcon size={14} /> View photo
                    </a>
                  ) : mode === "COACH" && !photo ? (
                    <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>No photo uploaded.</span>
                  ) : (
                    <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>Photo is optional.</span>
                  )}
                </div>

                {selectedFiles[uploadKey] && mode === "CLIENT" && !busy && (
                  <div style={{ marginTop: 7, fontSize: 9, color: "var(--text-secondary)" }}>
                    Selected: {selectedFiles[uploadKey]?.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {(message || error) && (
        <div className={error ? "error-banner" : "app-card"} style={!error ? { padding: "13px 16px", color: "var(--accent-green)", fontSize: 11 } : undefined}>
          {error || message}
        </div>
      )}
    </div>
  );
}
