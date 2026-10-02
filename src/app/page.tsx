// app/page.tsx
"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Briefcase,
  Camera,
  Dumbbell,
  Lock,
  Scale,
  Upload,
} from "lucide-react";
import { dashboardAPI, UserSession } from "@/services/api";

type Role = "CLIENT" | "COACH" | "ADMIN";
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

  // Login state
  const [selectedRole, setSelectedRole] = useState<Role>("CLIENT");
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
  const [coachSpecialization, setCoachSpecialization] =
    useState("hypertrophy");

  // Client onboarding
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState("sedentary");
  const [primaryGoal, setPrimaryGoal] = useState("fat_loss");
  const [medicalNotes, setMedicalNotes] = useState("");

  // Optional 3-day food photos
  const [threeDayPhotos, setThreeDayPhotos] = useState<
    Record<string, File | null>
  >({});
  const [uploadingOnboardingPhotos, setUploadingOnboardingPhotos] =
    useState(false);

  const routeByRole = (role: Role) => {
    if (role === "CLIENT") {
      router.push("/client");
      return;
    }

    if (role === "COACH") {
      router.push("/coach");
      return;
    }

    router.push("/admin");
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await dashboardAPI.login(
        selectedRole,
        identifier.trim(),
        password
      );

      if (user.mustChangePassword || user.onboardingCompleted === false) {
        setPendingUser(user);
        setCurrentStep(1);
      } else {
        routeByRole(user.role);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid ID or Password.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordStep = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (
      newPassword.length < 8 ||
      !/[A-Za-z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      setError("Use at least 8 characters, with both letters and numbers.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword === password) {
      setError(
        "New password must be different from your temporary password."
      );
      return;
    }

    setCurrentStep(2);
  };

  const uploadOnboardingPhotos = async () => {
    const selected = Object.entries(threeDayPhotos).filter(
      (entry): entry is [string, File] => entry[1] instanceof File
    );

    if (selected.length === 0) {
      return;
    }

    setUploadingOnboardingPhotos(true);

    try {
      for (const [key, file] of selected) {
        const [dayText, meal] = key.split("|");
        const day = Number(dayText);

        if (!day || !meal) {
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          console.warn(
            `Skipping ${file.name}: files must be 10 MB or smaller.`
          );
          continue;
        }

        if (
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif",
          ].includes(file.type)
        ) {
          console.warn(`Skipping ${file.name}: unsupported image type.`);
          continue;
        }

        const upload = await dashboardAPI.createThreeDayPhotoUpload({
          day,
          meal,
          fileName: file.name,
          contentType: file.type,
        });

        const form = new FormData();
        Object.entries(upload.fields).forEach(([name, value]) => {
          form.append(name, String(value));
        });
        form.append("file", file);

        const response = await fetch(upload.uploadUrl, {
          method: "POST",
          body: form,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${meal} on Day ${day}.`);
        }

        await dashboardAPI.completeThreeDayPhoto({
          day,
          meal,
          objectKey: upload.objectKey,
          originalFileName: file.name,
        });
      }
    } catch (err) {
      // Photos are optional. Do not block profile completion if an optional
      // upload fails.
      console.error("Optional onboarding photo upload failed:", err);
    } finally {
      setUploadingOnboardingPhotos(false);
    }
  };

  const handleFinalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pendingUser) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const extraPayload =
        pendingUser.role === "COACH"
          ? {
              specialization: coachSpecialization,
            }
          : pendingUser.role === "CLIENT"
            ? {
                age: Number(age),
                height: Number(height),
                weight: Number(weight),
                activityLevel,
                primaryGoal,
                medicalNotes,
              }
            : {};

      const updatedUser = await dashboardAPI.completeFirstTimeSetup({
        userId: pendingUser.PK,
        currentPassword: password,
        newPassword,
        ...extraPayload,
      });

      if (updatedUser.role === "CLIENT") {
        await uploadOnboardingPhotos();
      }

      routeByRole(updatedUser.role);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to complete onboarding.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeDayNumber = DAYS.indexOf(activeDay) + 1;

  const handlePhotoChange = (
    meal: (typeof MEALS)[number],
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] ?? null;
    const key = `${activeDayNumber}|${meal}`;

    if (file && file.size > 10 * 1024 * 1024) {
      setError("Each photo must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }

    if (
      file &&
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
      ].includes(file.type)
    ) {
      setError("Please choose a JPEG, PNG, WEBP, HEIC, or HEIF image.");
      event.target.value = "";
      return;
    }

    setError(null);
    setThreeDayPhotos((current) => ({
      ...current,
      [key]: file,
    }));

    event.target.value = "";
  };

  const identifierLabel =
    selectedRole === "CLIENT"
      ? "Athlete User ID (e.g. CLS001)"
      : selectedRole === "COACH"
        ? "Coach User ID (e.g. CHR001)"
        : "Admin User ID (e.g. ADH001)";

  const identifierPlaceholder =
    selectedRole === "CLIENT"
      ? "CLS001"
      : selectedRole === "COACH"
        ? "CHR001"
        : "ADH001";

  return (
    <div
      className="container"
      style={{
        maxWidth: pendingUser ? "800px" : "500px",
        justifyContent: "center",
      }}
    >
      <div className="app-card fade-in">
        <div
          className="section-header"
          style={{
            flexDirection: "column",
            alignItems: pendingUser ? "flex-start" : "center",
            gap: "4px",
            marginBottom: "32px",
            textAlign: pendingUser ? "left" : "center",
          }}
        >
          <h1
            className="animated-gradient-text"
            style={{
              fontSize: "32px",
              textTransform: "none",
            }}
          >
            {pendingUser
              ? `Welcome, ${pendingUser.name} (${pendingUser.userCode})`
              : "The Blue Fit"}
          </h1>

          <p
            className="label-text"
            style={{
              textTransform: "none",
              color: "var(--text-secondary)",
              letterSpacing: "0",
              fontSize: "14px",
            }}
          >
            {pendingUser
              ? "Set your personal password and complete your initial baseline profile."
              : "Select your portal and sign in with your Admin-issued ID & password."}
          </p>
        </div>

        {!pendingUser && (
          <form
            onSubmit={handleLogin}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div className="button-row" style={{ marginTop: 0 }}>
              <button
                type="button"
                className={
                  selectedRole === "CLIENT" ? "btn-primary" : "btn-secondary"
                }
                onClick={() => {
                  setSelectedRole("CLIENT");
                  setError(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "14px",
                }}
              >
                <Activity size={16} />
                Athlete / Client
              </button>

              <button
                type="button"
                className={
                  selectedRole === "COACH" ? "btn-primary" : "btn-secondary"
                }
                onClick={() => {
                  setSelectedRole("COACH");
                  setError(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "14px",
                }}
              >
                <Dumbbell size={16} />
                Coach / Trainer
              </button>

              <button
                type="button"
                className={
                  selectedRole === "ADMIN" ? "btn-primary" : "btn-secondary"
                }
                onClick={() => {
                  setSelectedRole("ADMIN");
                  setError(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "14px",
                }}
              >
                <Lock size={16} />
                Admin
              </button>
            </div>

            <div
              style={{
                ...panelStyle,
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div>
                <label className="label-text">{identifierLabel}</label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  style={inputStyle}
                  placeholder={identifierPlaceholder}
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="label-text">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  style={inputStyle}
                  placeholder="Enter password (or Admin temp password)"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isSubmitting
                ? "Verifying..."
                : `Enter ${
                    selectedRole === "CLIENT"
                      ? "Athlete"
                      : selectedRole === "COACH"
                        ? "Coach"
                        : "Admin"
                  } Portal`}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {pendingUser && (
          <>
            <div className="progress-container">
              <div className="progress-line">
                <div
                  className="progress-line-fill"
                  style={{
                    width:
                      currentStep === 1
                        ? "33%"
                        : currentStep === 2
                          ? pendingUser.role === "CLIENT"
                            ? "66%"
                            : "100%"
                          : "100%",
                  }}
                />
              </div>

              <div className="progress-step">
                <div
                  className={`progress-dot ${
                    currentStep >= 1 ? "active" : ""
                  }`}
                />
                <span
                  className={`progress-label ${
                    currentStep >= 1 ? "active-label" : ""
                  }`}
                >
                  Password
                </span>
              </div>

              <div className="progress-step">
                <div
                  className={`progress-dot ${
                    currentStep >= 2 ? "active" : ""
                  }`}
                />
                <span
                  className={`progress-label ${
                    currentStep >= 2 ? "active-label" : ""
                  }`}
                >
                  {pendingUser.role === "CLIENT" ? "Metrics" : "Profile"}
                </span>
              </div>

              {pendingUser.role === "CLIENT" && (
                <div className="progress-step">
                  <div
                    className={`progress-dot ${
                      currentStep >= 3 ? "active" : ""
                    }`}
                  />
                  <span
                    className={`progress-label ${
                      currentStep >= 3 ? "active-label" : ""
                    }`}
                  >
                    3-Day Log
                  </span>
                </div>
              )}
            </div>

            {currentStep === 1 && (
              <form
                onSubmit={handlePasswordStep}
                className="fade-in"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                <div style={panelStyle}>
                  <h3
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "var(--text-primary)",
                      fontSize: "16px",
                      marginBottom: "20px",
                      fontWeight: "600",
                    }}
                  >
                    <Lock size={18} color="var(--accent-gold)" />
                    Set Your New Password
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <label className="label-text">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(event) =>
                          setNewPassword(event.target.value)
                        }
                        style={inputStyle}
                        placeholder="Minimum 8 characters"
                        autoComplete="new-password"
                      />
                    </div>

                    <div>
                      <label className="label-text">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        style={inputStyle}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>

                {error && <div className="error-banner">{error}</div>}

                <button type="submit" className="btn-primary">
                  Continue to Initial Onboarding
                </button>
              </form>
            )}

            {currentStep === 2 && (
              <form
                onSubmit={handleFinalSubmit}
                className="fade-in"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                {pendingUser.role === "COACH" && (
                  <div style={panelStyle}>
                    <h3
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "var(--text-primary)",
                        fontSize: "16px",
                        marginBottom: "20px",
                        fontWeight: "600",
                      }}
                    >
                      <Briefcase size={18} color="var(--accent-gold)" />
                      Coach Profile
                    </h3>

                    <div>
                      <label className="label-text">
                        Primary Specialization
                      </label>
                      <select
                        value={coachSpecialization}
                        onChange={(event) =>
                          setCoachSpecialization(event.target.value)
                        }
                        style={{
                          ...inputStyle,
                          appearance: "none",
                          WebkitAppearance: "none",
                          backgroundImage: selectBg,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 14px top 50%",
                          backgroundSize: "10px auto",
                        }}
                      >
                        <option value="hypertrophy">
                          Muscle Hypertrophy & Bodybuilding
                        </option>
                        <option value="nutrition">
                          Clinical Nutrition & Fat Loss
                        </option>
                        <option value="mobility">
                          Mobility & Injury Rehab
                        </option>
                        <option value="powerlifting">
                          Strength & Powerlifting
                        </option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary"
                      style={{ marginTop: "24px", width: "100%" }}
                    >
                      {isSubmitting
                        ? "Saving..."
                        : "Complete Setup & Enter Coach Portal"}
                    </button>
                  </div>
                )}

                {pendingUser.role === "ADMIN" && (
                  <div style={panelStyle}>
                    <h3
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "var(--text-primary)",
                        fontSize: "16px",
                        marginBottom: "12px",
                        fontWeight: "600",
                      }}
                    >
                      <Lock size={18} color="var(--accent-gold)" />
                      Admin Account Setup
                    </h3>
                    <p
                      style={{
                        color: "var(--text-secondary)",
                        margin: 0,
                        lineHeight: 1.6,
                      }}
                    >
                      Your new password is ready. Complete setup to enter the
                      Admin portal.
                    </p>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary"
                      style={{ marginTop: "24px", width: "100%" }}
                    >
                      {isSubmitting
                        ? "Saving..."
                        : "Complete Setup & Enter Admin Portal"}
                    </button>
                  </div>
                )}

                {pendingUser.role === "CLIENT" && (
                  <>
                    <div style={panelStyle}>
                      <h3
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: "var(--text-primary)",
                          fontSize: "16px",
                          marginBottom: "20px",
                          fontWeight: "600",
                        }}
                      >
                        <Scale size={18} color="var(--accent-gold)" />
                        Physical Attributes
                      </h3>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(150px, 1fr))",
                          gap: "16px",
                        }}
                      >
                        <div>
                          <label className="label-text">Age</label>
                          <input
                            type="number"
                            required
                            min="1"
                            max="120"
                            value={age}
                            onChange={(event) =>
                              setAge(event.target.value)
                            }
                            style={inputStyle}
                            placeholder="e.g. 28"
                          />
                        </div>

                        <div>
                          <label className="label-text">Height (cm)</label>
                          <input
                            type="number"
                            required
                            min="50"
                            max="260"
                            step="0.1"
                            value={height}
                            onChange={(event) =>
                              setHeight(event.target.value)
                            }
                            style={inputStyle}
                            placeholder="e.g. 175"
                          />
                        </div>

                        <div>
                          <label className="label-text">
                            Current Weight (kg)
                          </label>
                          <input
                            type="number"
                            required
                            min="20"
                            max="500"
                            step="0.1"
                            value={weight}
                            onChange={(event) =>
                              setWeight(event.target.value)
                            }
                            style={inputStyle}
                            placeholder="e.g. 82.5"
                          />
                        </div>
                      </div>
                    </div>

                    <div style={panelStyle}>
                      <h3
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: "var(--text-primary)",
                          fontSize: "16px",
                          marginBottom: "20px",
                          fontWeight: "600",
                        }}
                      >
                        <Activity size={18} color="#60A5FA" />
                        Lifestyle & Health
                      </h3>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "20px",
                        }}
                      >
                        <div>
                          <label className="label-text">
                            Daily Activity Level
                          </label>
                          <select
                            value={activityLevel}
                            onChange={(event) =>
                              setActivityLevel(event.target.value)
                            }
                            style={{
                              ...inputStyle,
                              appearance: "none",
                              WebkitAppearance: "none",
                              backgroundImage: selectBg,
                              backgroundRepeat: "no-repeat",
                              backgroundPosition:
                                "right 14px top 50%",
                              backgroundSize: "10px auto",
                            }}
                          >
                            <option value="sedentary">
                              Sedentary (Desk job, minimal movement)
                            </option>
                            <option value="moderate">
                              Moderately Active (3-5 workouts/week)
                            </option>
                            <option value="high">
                              Very Active (Heavy training / active work)
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="label-text">
                            Primary Fitness Goal
                          </label>
                          <select
                            value={primaryGoal}
                            onChange={(event) =>
                              setPrimaryGoal(event.target.value)
                            }
                            style={{
                              ...inputStyle,
                              appearance: "none",
                              WebkitAppearance: "none",
                              backgroundImage: selectBg,
                              backgroundRepeat: "no-repeat",
                              backgroundPosition:
                                "right 14px top 50%",
                              backgroundSize: "10px auto",
                            }}
                          >
                            <option value="fat_loss">
                              Fat Loss & Definition
                            </option>
                            <option value="hypertrophy">
                              Muscle Hypertrophy
                            </option>
                            <option value="recomp">
                              Body Recomposition
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="label-text">
                            Medical Notes / Limitations
                          </label>
                          <textarea
                            rows={3}
                            value={medicalNotes}
                            onChange={(event) =>
                              setMedicalNotes(event.target.value)
                            }
                            style={{
                              ...inputStyle,
                              resize: "none",
                            }}
                            placeholder="List any past injuries or dietary restrictions..."
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!age || !height || !weight}
                      onClick={() => {
                        setError(null);
                        setCurrentStep(3);
                      }}
                      className="btn-primary"
                    >
                      Continue to 3-Day Food Log
                    </button>
                  </>
                )}
              </form>
            )}

            {currentStep === 3 && pendingUser.role === "CLIENT" && (
              <form
                onSubmit={handleFinalSubmit}
                className="fade-in"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                <div className="button-row" style={{ marginTop: 0 }}>
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      className={
                        activeDay === day ? "btn-primary" : "btn-secondary"
                      }
                      onClick={() => {
                        setActiveDay(day);
                        setError(null);
                      }}
                      style={{ padding: "12px", flex: 1 }}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                <div style={panelStyle}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <h3
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "var(--text-primary)",
                        fontSize: "16px",
                        fontWeight: "600",
                        margin: 0,
                      }}
                    >
                      <Camera size={18} color="#60A5FA" />
                      {activeDay} Dietary Recall
                    </h3>

                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "12px",
                      }}
                    >
                      Photos are optional
                    </span>
                  </div>

                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "13px",
                      marginTop: 0,
                      marginBottom: "20px",
                    }}
                  >
                    Upload a meal photo for any meal you want your coach to
                    review. You can leave any or all meals empty.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {MEALS.map((meal) => {
                      const key = `${activeDayNumber}|${meal}`;
                      const selectedFile = threeDayPhotos[key];

                      return (
                        <label
                          key={`${activeDay}-${meal}`}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: "150px",
                            border: "2px dashed var(--border-subtle)",
                            borderRadius: "var(--radius-sm)",
                            background: "rgba(0,0,0,0.2)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            textAlign: "center",
                            padding: "12px",
                          }}
                        >
                          <Upload
                            size={24}
                            color="var(--text-secondary)"
                            style={{ marginBottom: "12px" }}
                          />

                          <span
                            className="label-text"
                            style={{
                              color: "var(--text-primary)",
                              marginBottom: "4px",
                            }}
                          >
                            {meal}
                          </span>

                          <span
                            style={{
                              color: "var(--text-secondary)",
                              fontSize: "10px",
                            }}
                          >
                            {selectedFile ? "Photo selected" : "Optional"}
                          </span>

                          {selectedFile && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "var(--accent-green)",
                                marginTop: "6px",
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={selectedFile.name}
                            >
                              {selectedFile.name}
                            </span>
                          )}

                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                            style={{ display: "none" }}
                            onChange={(event) =>
                              handlePhotoChange(meal, event)
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {error && <div className="error-banner">{error}</div>}

                <div className="button-row" style={{ marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="btn-secondary"
                    disabled={isSubmitting}
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || uploadingOnboardingPhotos}
                    className="btn-primary"
                  >
                    {isSubmitting
                      ? uploadingOnboardingPhotos
                        ? "Saving & Uploading Photos..."
                        : "Saving Assessment..."
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
