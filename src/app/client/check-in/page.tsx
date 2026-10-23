"use client";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Scale, TrendingUp, CheckCircle2, Upload, X } from "lucide-react";
import { dashboardAPI } from "@/services/api";

const ANGLES = ["Front", "Side", "Back"] as const;

type UploadedPhoto = { angle: string; file: File; preview: string };

const inputStyle = {
  width: "100%",
  padding: "14px",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-primary)",
  outline: "none",
  fontSize: "15px",
  marginTop: "8px",
  transition: "border-color 0.2s ease",
} as const;

export default function WeeklyCheckIn() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handlePhotoChange = (angle: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError("Each photo must be 15 MB or smaller.");
      e.target.value = "";
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type)) {
      setError("Please choose a JPEG, PNG, WEBP, HEIC, or HEIF photo.");
      e.target.value = "";
      return;
    }

    setError(null);
    const preview = URL.createObjectURL(file);
    setPhotos((prev) => {
      const filtered = prev.filter((p) => p.angle !== angle);
      return [...filtered, { angle, file, preview }];
    });
    e.target.value = "";
  };

  const removePhoto = (angle: string) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.angle === angle);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((p) => p.angle !== angle);
    });
  };

  const uploadProgressPhotos = async (checkinId: string) => {
    if (photos.length === 0) return;

    for (const { angle, file } of photos) {
      setUploadProgress(`Uploading ${angle} photo…`);

      // Reuse the 3-day photo upload endpoint with day=0 to indicate weekly check-in photos
      const upload = await dashboardAPI.createProgressPhotoUpload({
        checkinId,
        angle: angle.toLowerCase(),
        fileName: file.name,
        contentType: file.type,
      });

      const form = new FormData();
      Object.entries(upload.fields).forEach(([k, v]) => form.append(k, String(v)));
      form.append("file", file);

      const res = await fetch(upload.uploadUrl, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Failed to upload ${angle} photo.`);

      await dashboardAPI.completeProgressPhoto({
        checkinId,
        angle: angle.toLowerCase(),
        objectKey: upload.objectKey,
        originalFileName: file.name,
      });
    }
    setUploadProgress(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(e.currentTarget);
    const waist = String(form.get("waist") || "").trim();
    const notes = String(form.get("notes") || "").trim();

    try {
      const saved = await dashboardAPI.saveCheckin({
        weight: Number(form.get("weight")),
        adherence: String(form.get("adherence")),
        workoutQuality: String(form.get("workoutQuality")),
        ...(waist ? { waist: Number(waist) } : {}),
        ...(notes ? { notes } : {}),
      });

      // Upload progress photos after saving the check-in record
      if (photos.length > 0) {
        try {
          await uploadProgressPhotos(saved.checkinId);
        } catch (photoErr: any) {
          // The check-in itself is already saved — don't make the athlete submit it twice.
          setError(`Your check-in was saved, but a photo could not be uploaded (${photoErr?.message || "upload failed"}).`);
          setSubmitted(true);
          return;
        }
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Could not save your check-in. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const selectStyle = {
    ...inputStyle,
    WebkitAppearance: "none" as const,
    appearance: "none" as const,
    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23888888%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
    backgroundRepeat: "no-repeat" as const,
    backgroundPosition: "right 14px top 50%" as const,
    backgroundSize: "10px auto" as const,
  };

  if (submitted) {
    return (
      <div className="container" style={{ maxWidth: "600px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div className="app-card fade-in" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ width: "80px", height: "80px", background: "rgba(0,226,123,0.1)", border: "1px solid var(--accent-green)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <CheckCircle2 size={40} color="#00E27B" />
          </div>
          <h2 className="animated-gradient-text" style={{ fontSize: "28px", marginBottom: "12px", textTransform: "none" }}>Check-In Complete</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "32px", fontSize: "15px" }}>
            Your coach has been notified and will review your progress shortly.
            {photos.length > 0 && !error && " Progress photos have been uploaded securely."}
          </p>
          {error && (
            <p style={{ color: "var(--accent-gold)", marginBottom: "24px", fontSize: "13px" }}>{error}</p>
          )}
          <button onClick={() => router.push("/client")} className="btn-primary full-width">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "800px" }}>
      <div className="app-card fade-in">
        <div className="section-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px", marginBottom: "32px" }}>
          <h1 className="animated-gradient-text" style={{ fontSize: "32px", textTransform: "none" }}>Weekly Review</h1>
          <p className="label-text" style={{ textTransform: "none", color: "var(--text-secondary)", letterSpacing: "0", fontSize: "14px" }}>
            Log your physical metrics and how you felt this week.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Body metrics */}
          <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "24px", backdropFilter: "blur(10px)" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)", fontSize: "16px", marginBottom: "20px", fontWeight: "600" }}>
              <Scale size={18} color="var(--accent-gold)" /> Body Metrics
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
              <div>
                <label className="label-text">Current Weight (kg)</label>
                <input name="weight" type="number" step="0.1" required style={inputStyle} placeholder="e.g. 67.5" />
              </div>
              <div>
                <label className="label-text">Waist (cm)</label>
                <input name="waist" type="number" step="0.5" style={inputStyle} placeholder="e.g. 82.0" />
              </div>
            </div>
          </div>

          {/* Performance */}
          <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "24px", backdropFilter: "blur(10px)" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)", fontSize: "16px", marginBottom: "20px", fontWeight: "600" }}>
              <TrendingUp size={18} color="var(--accent-green)" /> Performance & Recovery
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label className="label-text">Diet Adherence</label>
                <select name="adherence" style={selectStyle}>
                  <option value="strict" style={{ background: "#111" }}>Strictly followed the plan</option>
                  <option value="mostly" style={{ background: "#111" }}>Mostly followed, minor slips</option>
                  <option value="struggled" style={{ background: "#111" }}>Struggled this week</option>
                </select>
              </div>
              <div>
                <label className="label-text">Workout Quality</label>
                <select name="workoutQuality" style={selectStyle}>
                  <option value="strong" style={{ background: "#111" }}>Strong — progressed on lifts</option>
                  <option value="maintained" style={{ background: "#111" }}>Maintained strength</option>
                  <option value="weak" style={{ background: "#111" }}>Felt fatigued / weak</option>
                </select>
              </div>
              <div>
                <label className="label-text">Challenges & Notes</label>
                <textarea name="notes" maxLength={2000} rows={3} style={{ ...inputStyle, resize: "none" }} placeholder="Sleep, stress, digestion, anything notable…" />
              </div>
            </div>
          </div>

          {/* Progress photos — wired to S3 */}
          <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "24px", backdropFilter: "blur(10px)" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)", fontSize: "16px", marginBottom: "6px", fontWeight: "600" }}>
              <Camera size={18} color="#60A5FA" /> Progress Photos
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "20px" }}>
              Optional — uploaded privately to your secure storage. Your coach can view them from their dashboard.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "16px" }}>
              {ANGLES.map((angle) => {
                const uploaded = photos.find((p) => p.angle === angle);
                return (
                  <div key={angle} style={{ position: "relative" }}>
                    <label
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "130px", border: `2px dashed ${uploaded ? "var(--accent-green)" : "var(--border-subtle)"}`, borderRadius: "var(--radius-sm)", background: uploaded ? "rgba(0,226,123,0.05)" : "rgba(0,0,0,0.2)", cursor: "pointer", transition: "all 0.2s ease", textAlign: "center", padding: "10px", overflow: "hidden" }}
                      onMouseOver={(e) => { if (!uploaded) { e.currentTarget.style.borderColor = "var(--accent-gold)"; e.currentTarget.style.background = "rgba(229,184,105,0.05)"; } }}
                      onMouseOut={(e) => { if (!uploaded) { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = "rgba(0,0,0,0.2)"; } }}
                    >
                      {uploaded ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={uploaded.preview} alt={`${angle} preview`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "calc(var(--radius-sm) - 4px)", position: "absolute", inset: 0 }} />
                      ) : (
                        <>
                          <Upload size={22} color="var(--text-secondary)" style={{ marginBottom: "8px" }} />
                          <span className="label-text">{angle}</span>
                        </>
                      )}
                      <input ref={(el) => { fileRefs.current[angle] = el; }} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" style={{ display: "none" }} onChange={(e) => handlePhotoChange(angle, e)} />
                    </label>

                    {uploaded && (
                      <button
                        type="button"
                        onClick={() => removePhoto(angle)}
                        style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}
                        aria-label={`Remove ${angle} photo`}
                      >
                        <X size={13} color="#fff" />
                      </button>
                    )}

                    <span style={{ display: "block", textAlign: "center", fontSize: "11px", color: uploaded ? "var(--accent-green)" : "var(--text-secondary)", marginTop: "6px" }}>
                      {uploaded ? `${angle} ✓` : angle}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: "8px" }}>
            {isSubmitting
              ? (uploadProgress || "Saving…")
              : `Submit Check-In${photos.length > 0 ? ` & Upload ${photos.length} Photo${photos.length > 1 ? "s" : ""}` : ""}`}
          </button>
        </form>
      </div>
    </div>
  );
}
