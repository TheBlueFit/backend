// app/page.tsx — single unified login (no role selector: the server detects it)
"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload } from "lucide-react";
import { dashboardAPI, UserSession } from "@/services/api";

type SetupStep = 1 | 2 | 3;

const DAYS = ["Day 1", "Day 2", "Day 3"] as const;
const MEALS = ["Breakfast", "Brunch", "Lunch", "Snacks", "Dinner"] as const;

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

const panelStyle = {
  background: "var(--bg-input)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  padding: "24px",
  backdropFilter: "blur(10px)",
} as const;

const selectBg =
  'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23888888%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")';

export default function OpeningPortalPage() {
  const router = useRouter();

  // Login state — no role needed; the server auto-detects from the user ID
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // First-time setup state
  const [pendingUser, setPendingUser] = useState<UserSession | null>(null);
  const [currentStep, setCurrentStep] = useState<SetupStep>(1);
  const [activeDay, setActiveDay] = useState<(typeof DAYS)[number]>("Day 1");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Coach onboarding
  const [coachSpecialization, setCoachSpecialization] = useState("hypertrophy");

  // Client onboarding
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState("sedentary");
  const [primaryGoal, setPrimaryGoal] = useState("fat_loss");
  const [medicalNotes, setMedicalNotes] = useState("");

  // Optional 3-day food photos
  const [threeDayPhotos, setThreeDayPhotos] = useState<Record<string, File | null>>({});
  const [uploadingOnboardingPhotos, setUploadingOnboardingPhotos] = useState(false);

  const routeByRole = (role: string) => {
    if (role === "CLIENT") router.push("/client");
    else if (role === "COACH") router.push("/coach");
    else router.push("/admin");
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Pass role as undefined so the backend detects it from the user ID
      const user = await dashboardAPI.login(undefined as any, identifier.trim(), password);

      if (user.mustChangePassword || user.onboardingCompleted === false) {
        setPendingUser(user);
        setCurrentStep(1);
      } else {
        routeByRole(user.role);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid ID or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordStep = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError("Use at least 8 characters, with both letters and numbers.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword === password) {
      setError("New password must be different from your temporary password.");
      return;
    }
    setCurrentStep(2);
  };

  const uploadOnboardingPhotos = async () => {
    const selected = Object.entries(threeDayPhotos).filter(
      (entry): entry is [string, File] => entry[1] instanceof File
    );
    if (selected.length === 0) return;

    setUploadingOnboardingPhotos(true);
    try {
      for (const [key, file] of selected) {
        const [dayText, meal] = key.split("|");
        const day = Number(dayText);
        if (!day || !meal) continue;
        if (file.size > 10 * 1024 * 1024) { console.warn(`Skipping ${file.name}: >10 MB`); continue; }
        if (!["image/jpeg","image/png","image/webp","image/heic","image/heif"].includes(file.type)) {
          console.warn(`Skipping ${file.name}: unsupported type`); continue;
        }

        const upload = await dashboardAPI.createThreeDayPhotoUpload({ day, meal, fileName: file.name, contentType: file.type });
        const form = new FormData();
        Object.entries(upload.fields).forEach(([k, v]) => form.append(k, String(v)));
        form.append("file", file);
        const res = await fetch(upload.uploadUrl, { method: "POST", body: form });
        if (!res.ok) throw new Error(`Upload failed for ${meal} on Day ${day}.`);
        await dashboardAPI.completeThreeDayPhoto({ day, meal, objectKey: upload.objectKey, originalFileName: file.name });
      }
    } catch (err) {
      console.error("Optional onboarding photo upload failed:", err);
    } finally {
      setUploadingOnboardingPhotos(false);
    }
  };

  const handleFinalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingUser) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const extraPayload =
        pendingUser.role === "COACH"
          ? { specialization: coachSpecialization }
          : pendingUser.role === "CLIENT"
          ? { age: Number(age), height: Number(height), weight: Number(weight), activityLevel, primaryGoal, medicalNotes }
          : {};

      const updatedUser = await dashboardAPI.completeFirstTimeSetup({
        userId: pendingUser.PK,
        currentPassword: password,
        newPassword,
        ...extraPayload,
      });

      if (updatedUser.role === "CLIENT") await uploadOnboardingPhotos();
      routeByRole(updatedUser.role);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeDayNumber = DAYS.indexOf(activeDay) + 1;

  const handlePhotoChange = (meal: (typeof MEALS)[number], event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    const key = `${activeDayNumber}|${meal}`;

    if (file && file.size > 10 * 1024 * 1024) {
      setError("Each photo must be 10 MB or smaller.");
      event.target.value = ""; return;
    }
    if (file && !["image/jpeg","image/png","image/webp","image/heic","image/heif"].includes(file.type)) {
      setError("Please choose a JPEG, PNG, WEBP, HEIC, or HEIF image.");
      event.target.value = ""; return;
    }
    setError(null);
    setThreeDayPhotos((c) => ({ ...c, [key]: file }));
    event.target.value = "";
  };

  return (
    <div className="container" style={{ maxWidth: pendingUser ? "800px" : "480px", justifyContent: "center" }}>
      <div className="app-card fade-in">
        {/* Header */}
        <div className="section-header" style={{ flexDirection: "column", alignItems: pendingUser ? "flex-start" : "center", gap: "4px", marginBottom: "32px", textAlign: pendingUser ? "left" : "center" }}>
          <h1 className="animated-gradient-text" style={{ fontSize: "32px", textTransform: "none" }}>
            {pendingUser ? `Welcome, ${pendingUser.name} (${pendingUser.userCode})` : "The Blue Fit"}
          </h1>
          <p className="label-text" style={{ textTransform: "none", color: "var(--text-secondary)", letterSpacing: "0", fontSize: "14px" }}>
            {pendingUser
              ? "Set your personal password and complete your initial baseline profile."
              : "Sign in with your Admin-issued ID and password."}
          </p>
        </div>

        {/* ── MAIN LOGIN FORM ─────────────────────────────────────── */}
        {!pendingUser && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label className="label-text">User ID or Email</label>
              <input
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. CLS001, CHR001 or ADH001"
                required
                style={inputStyle}
              />
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px" }}>
                Athlete IDs start with CL · Coach IDs with CH · Admin IDs with AD
              </p>
            </div>

            <div>
              <label className="label-text">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                style={inputStyle}
              />
            </div>

            {error && <div className="error-banner">{error}</div>}

            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: "4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {isSubmitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
        )}

        {/* ── FIRST-TIME SETUP ─────────────────────────────────────── */}
        {pendingUser && (
          <>
            {/* Step 1: set new password */}
            {currentStep === 1 && (
              <form onSubmit={handlePasswordStep} className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={panelStyle}>
                  <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>
                    Create your personal password
                  </h3>
                  <div>
                    <label className="label-text">New Password</label>
                    <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters with a number" required style={inputStyle} />
                  </div>
                  <div style={{ marginTop: "16px" }}>
                    <label className="label-text">Confirm Password</label>
                    <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" required style={inputStyle} />
                  </div>
                </div>

                {error && <div className="error-banner">{error}</div>}

                <button type="submit" className="btn-primary">Continue</button>
              </form>
            )}

            {/* Step 2: role-specific profile */}
            {currentStep === 2 && (
              <form className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={panelStyle}>
                  <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>
                    {pendingUser.role === "COACH" ? "Your coaching profile" : "Your baseline assessment"}
                  </h3>

                  {pendingUser.role === "COACH" && (
                    <div>
                      <label className="label-text">Coaching Specialisation</label>
                      <select value={coachSpecialization} onChange={(e) => setCoachSpecialization(e.target.value)} style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", backgroundImage: selectBg, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px top 50%", backgroundSize: "10px auto" }}>
                        <option value="hypertrophy">Hypertrophy / Muscle Building</option>
                        <option value="fat_loss">Fat Loss & Body Recomposition</option>
                        <option value="strength">Strength & Performance</option>
                        <option value="general">General Health & Wellness</option>
                      </select>
                    </div>
                  )}

                  {pendingUser.role === "CLIENT" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "16px" }}>
                        <div>
                          <label className="label-text">Age</label>
                          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 28" style={inputStyle} />
                        </div>
                        <div>
                          <label className="label-text">Height (cm)</label>
                          <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 172" style={inputStyle} />
                        </div>
                        <div>
                          <label className="label-text">Weight (kg)</label>
                          <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 68.5" style={inputStyle} />
                        </div>
                      </div>

                      <div>
                        <label className="label-text">Daily Activity Level</label>
                        <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)} style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", backgroundImage: selectBg, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px top 50%", backgroundSize: "10px auto" }}>
                          <option value="sedentary">Sedentary (desk job, minimal movement)</option>
                          <option value="moderate">Moderately active (3–5 workouts/week)</option>
                          <option value="high">Very active (heavy training / active job)</option>
                        </select>
                      </div>

                      <div>
                        <label className="label-text">Primary Fitness Goal</label>
                        <select value={primaryGoal} onChange={(e) => setPrimaryGoal(e.target.value)} style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", backgroundImage: selectBg, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px top 50%", backgroundSize: "10px auto" }}>
                          <option value="fat_loss">Fat Loss & Definition</option>
                          <option value="hypertrophy">Muscle Hypertrophy</option>
                          <option value="recomp">Body Recomposition</option>
                        </select>
                      </div>

                      <div>
                        <label className="label-text">Medical Notes / Limitations</label>
                        <textarea rows={3} value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} style={{ ...inputStyle, resize: "none" }} placeholder="Past injuries or dietary restrictions (optional)" />
                      </div>
                    </div>
                  )}
                </div>

                {error && <div className="error-banner">{error}</div>}

                <div className="button-row" style={{ marginTop: 0 }}>
                  <button type="button" onClick={() => { setError(null); setCurrentStep(1); }} className="btn-secondary">Back</button>
                  {pendingUser.role === "CLIENT" ? (
                    <button type="button" disabled={!age || !height || !weight} onClick={() => { setError(null); setCurrentStep(3); }} className="btn-primary">
                      Continue to 3-Day Food Log
                    </button>
                  ) : (
                    <button type="button" onClick={() => { setError(null); handleFinalSubmit({ preventDefault: () => {} } as any); }} disabled={isSubmitting} className="btn-primary">
                      {isSubmitting ? "Saving…" : "Complete Setup"}
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Step 3: optional 3-day food photos (CLIENT only) */}
            {currentStep === 3 && pendingUser.role === "CLIENT" && (
              <form onSubmit={handleFinalSubmit} className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div className="button-row" style={{ marginTop: 0 }}>
                  {DAYS.map((day) => (
                    <button key={day} type="button" className={activeDay === day ? "btn-primary" : "btn-secondary"} onClick={() => { setActiveDay(day); setError(null); }} style={{ padding: "12px", flex: 1 }}>
                      {day}
                    </button>
                  ))}
                </div>

                <div style={panelStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "12px", flexWrap: "wrap" }}>
                    <h3 style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)", fontSize: "16px", fontWeight: "600", margin: 0 }}>
                      <Camera size={18} color="#60A5FA" />
                      {activeDay} Dietary Recall
                    </h3>
                    <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Photos are optional</span>
                  </div>

                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: 0, marginBottom: "20px" }}>
                    Upload a meal photo for any meal you want your coach to review.
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px" }}>
                    {MEALS.map((meal) => {
                      const key = `${activeDayNumber}|${meal}`;
                      const selectedFile = threeDayPhotos[key];
                      return (
                        <label key={`${activeDay}-${meal}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "150px", border: "2px dashed var(--border-subtle)", borderRadius: "var(--radius-sm)", background: "rgba(0,0,0,0.2)", cursor: "pointer", transition: "all 0.2s ease", textAlign: "center", padding: "12px" }}>
                          <Upload size={24} color="var(--text-secondary)" style={{ marginBottom: "12px" }} />
                          <span className="label-text" style={{ color: "var(--text-primary)", marginBottom: "4px" }}>{meal}</span>
                          <span style={{ color: "var(--text-secondary)", fontSize: "10px" }}>{selectedFile ? "Photo selected ✓" : "Optional"}</span>
                          {selectedFile && (
                            <span style={{ fontSize: "10px", color: "var(--accent-green)", marginTop: "6px", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={selectedFile.name}>
                              {selectedFile.name}
                            </span>
                          )}
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" style={{ display: "none" }} onChange={(e) => handlePhotoChange(meal, e)} />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {error && <div className="error-banner">{error}</div>}

                <div className="button-row" style={{ marginTop: "8px" }}>
                  <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary" disabled={isSubmitting}>Back</button>
                  <button type="submit" disabled={isSubmitting || uploadingOnboardingPhotos} className="btn-primary">
                    {isSubmitting
                      ? uploadingOnboardingPhotos ? "Saving & Uploading Photos…" : "Saving Assessment…"
                      : "Save Assessment & Enter Athlete Portal"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
