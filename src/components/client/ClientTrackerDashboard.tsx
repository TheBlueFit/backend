"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Droplets,
  Flame,
  Footprints,
  HeartPulse,
  Moon,
  Trophy,
  Dumbbell,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import MetricCard from "@/components/shared/MetricCard";
import ShapeFiller from "@/components/shared/ShapeFiller";

interface ClientTrackerDashboardProps {
  steps?: number | null;
  stepGoal?: number | null;

  sleepHours?: number | null;
  sleepGoal?: number | null;

  hydration?: number | null;
  hydrationGoal?: number | null;

  workoutCompletion?: number | null;
  recovery?: number | null;

  calories?: number | null;
  heartRate?: number | null;
  workoutsThisWeek?: number | null;
}

const clamp = (value: number) =>
  Math.min(100, Math.max(0, Number(value) || 0));

function OverallPulse({
  value,
  hasData,
}: {
  value?: number | null;
  hasData: boolean;
}) {
  const safe = value == null ? 0 : clamp(value);
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (!hasData) {
      setAnimated(0);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const duration = 900;

    const tick = (time: number) => {
      const ratio = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);
      setAnimated(safe * eased);
      if (ratio < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [safe, hasData]);

  return (
    <div
      className="bf-pulse-score"
      aria-label={`Daily pulse score: ${hasData ? `${Math.round(safe)} percent` : "no data"}`}
    >
      <div className="bf-pulse-score-orbit" aria-hidden="true" />
      <div className="bf-pulse-score-inner">
        <span className="bf-pulse-score-value">
          {hasData ? Math.round(animated) : "—"}
        </span>
        <span className="bf-pulse-score-unit">/ 100</span>
        <span className="bf-pulse-score-label">Daily pulse</span>
      </div>
    </div>
  );
}

function SignatureMetric({
  shape,
  accent,
  eyebrow,
  value,
  unit,
  detail,
  progress,
}: {
  shape: "footsteps" | "droplet" | "heart" | "moon" | "barbell";
  accent: string;
  eyebrow: string;
  value: string;
  unit?: string;
  detail: string;
  progress?: number | null;
}) {
  const hasProgress = progress != null && Number.isFinite(Number(progress));
  const safeProgress = hasProgress ? clamp(Number(progress)) : 0;

  return (
    <div
      className="bf-signature-metric"
      style={{ ["--signature-accent" as string]: accent } as React.CSSProperties}
    >
      <div className="bf-signature-top">
        <span className="bf-signature-eyebrow">{eyebrow}</span>
        <span className="bf-signature-value">
          {value}
          {unit && <small>{unit}</small>}
        </span>
      </div>

      <div className="bf-signature-visual">
        <div className="bf-signature-art">
          <div className="bf-signature-glow" aria-hidden="true" />
          <ShapeFiller
            shape={shape}
            progress={hasProgress ? safeProgress : undefined}
            accent={accent}
            size={shape === "barbell" ? 82 : 72}
            noData={!hasProgress}
          />
        </div>
        <div className="bf-signature-copy">
          <span>{detail}</span>
          <div className="bf-signature-progress">
            <div className="bf-signature-track">
              {hasProgress && (
                <div
                  className="bf-signature-fill"
                  style={{ width: `${safeProgress}%` }}
                />
              )}
            </div>
            <strong>{hasProgress ? `${Math.round(safeProgress)}%` : "—"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientTrackerDashboard({
  steps,
  stepGoal,
  sleepHours,
  sleepGoal,
  hydration,
  hydrationGoal,
  workoutCompletion,
  recovery,
  calories,
  heartRate,
  workoutsThisWeek,
}: ClientTrackerDashboardProps) {
  const stepProgress =
    steps != null &&
    stepGoal != null &&
    stepGoal > 0
      ? clamp(
          (steps / stepGoal) * 100
        )
      : undefined;

  const sleepProgress =
    sleepHours != null &&
    sleepGoal != null &&
    sleepGoal > 0
      ? clamp(
          (sleepHours / sleepGoal) * 100
        )
      : undefined;

  const hydrationProgress =
    hydration != null &&
    hydrationGoal != null &&
    hydrationGoal > 0
      ? clamp(
          (hydration / hydrationGoal) *
            100
        )
      : undefined;

  const hasAnyData =
    steps != null ||
    sleepHours != null ||
    hydration != null ||
    workoutCompletion != null ||
    recovery != null ||
    calories != null ||
    workoutsThisWeek != null;

  const [weeklyBars, setWeeklyBars] = useState([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);

  const hasWeeklyData =
    workoutsThisWeek != null;

  const pulseInputs = [
    stepProgress,
    sleepProgress,
    workoutCompletion,
    recovery,
  ].filter(
    (v): v is number =>
      v != null && Number.isFinite(Number(v))
  );

  const dailyPulse = pulseInputs.length
    ? pulseInputs.reduce((sum, value) => sum + value, 0) / pulseInputs.length
    : undefined;

  useEffect(() => {
    let frame = 0;

    const start = performance.now();
    const duration = 850;

    const target = hasWeeklyData
      ? [
          null,
          null,
          null,
          null,
          null,
          null,
          clamp(workoutCompletion ?? 0),
        ]
      : [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ];

    setWeeklyBars([
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    ]);

    if (!hasWeeklyData) {
      return undefined;
    }

    const animate = (time: number) => {
      const ratio = Math.min(
        (time - start) / duration,
        1
      );

      const eased =
        1 - Math.pow(1 - ratio, 3);

      setWeeklyBars(
        target.map((value) =>
          value == null
            ? 0
            : Number(value) * eased
        )
      );

      if (ratio < 1) {
        frame =
          requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);

    return () =>
      cancelAnimationFrame(frame);
  }, [
    workoutCompletion,
    workoutsThisWeek,
    hasWeeklyData,
  ]);

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      {/* Signature health overview */}
      <section className="bf-signature-overview">
        <div className="bf-signature-backdrop" aria-hidden="true" />

        <div className="bf-signature-heading">
          <div>
            <div className="bf-kicker">HEALTH OVERVIEW</div>
            <h3>Today's rhythm</h3>
            <p>
              {hasAnyData
                ? "A calmer view of the signals that matter today — each metric has its own visual language."
                : "Your personal activity will appear here as you move, sleep, train and recover."}
            </p>
          </div>
          <OverallPulse
            value={dailyPulse}
            hasData={dailyPulse != null}
          />
        </div>

        <div className="bf-signature-grid">
          <SignatureMetric
            shape="footsteps"
            accent="#68C7A1"
            eyebrow="Movement"
            value={steps != null ? steps.toLocaleString() : "—"}
            detail={
              stepProgress != null && stepGoal != null
                ? `${Math.round(stepProgress)}% of ${stepGoal.toLocaleString()} steps`
                : "Waiting for movement data"
            }
            progress={stepProgress}
          />

          <SignatureMetric
            shape="heart"
            accent="#C97878"
            eyebrow="Heart rate"
            value={heartRate != null ? `${Math.round(heartRate)}` : "—"}
            unit={heartRate != null ? " bpm" : undefined}
            detail={
              recovery != null
                ? `Readiness signal ${Math.round(recovery)}%`
                : heartRate != null
                ? "Heart signal available"
                : "Waiting for heart-rate data"
            }
            progress={recovery}
          />

          <SignatureMetric
            shape="moon"
            accent="#8E82C7"
            eyebrow="Sleep"
            value={sleepHours != null ? sleepHours.toFixed(1) : "—"}
            unit={sleepHours != null ? " h" : undefined}
            detail={
              sleepProgress != null && sleepGoal != null
                ? `${Math.round(sleepProgress)}% of ${sleepGoal}h target`
                : "Waiting for sleep data"
            }
            progress={sleepProgress}
          />

          <SignatureMetric
            shape="barbell"
            accent="#C19A5A"
            eyebrow="Workout"
            value={workoutCompletion != null ? `${Math.round(workoutCompletion)}` : "—"}
            unit={workoutCompletion != null ? "%" : undefined}
            detail={
              workoutsThisWeek != null
                ? `${workoutsThisWeek} sessions this week`
                : "Waiting for workout data"
            }
            progress={workoutCompletion}
          />
        </div>
      </section>

      {/* Daily focus */}
      <section className="bf-focus-card">
        <div className="bf-focus-icon">
          <HeartPulse size={17} />
        </div>

        <div className="bf-focus-copy">
          <div className="bf-kicker">
            TODAY'S FOCUS
          </div>

          <h4>
            {recovery != null
              ? "Protect the rhythm."
              : "Build your first signal."}
          </h4>

          <p>
            {recovery != null
              ? `Recovery is at ${Math.round(
                  recovery
                )}%. Keep hydration moving and complete your planned session.`
              : "Once activity and check-in data are recorded, your recovery and daily focus will appear here."}
          </p>
        </div>

        <div
          style={{
            width: "92px",
            minHeight: "92px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            flexShrink: 0,
          }}
        >
          <ShapeFiller
            shape="heart"
            progress={recovery ?? undefined}
            accent="#63B99B"
            size={64}
            noData={recovery == null}
          />
          <span
            style={{
              fontSize: "9px",
              color: "var(--text-secondary)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {recovery != null ? `${Math.round(recovery)}%` : "No data"}
          </span>
        </div>
      </section>

      {/* Core metrics */}
      <section className="bf-client-metric-grid">
        <MetricCard
          title="Steps"
          value={
            steps != null
              ? steps.toLocaleString()
              : "—"
          }
          description={
            stepGoal != null
              ? `Goal ${stepGoal.toLocaleString()} steps`
              : "No target set"
          }
          progress={stepProgress}
          progressLabel="Movement"
          accent="#68C7A1"
          fillerShape="footsteps"
          icon={
            <Footprints size={18} />
          }
        />

        <MetricCard
          title="Sleep"
          value={
            sleepHours != null
              ? sleepHours
              : "—"
          }
          unit={
            sleepHours != null
              ? "hrs"
              : ""
          }
          description={
            sleepGoal != null
              ? `Target ${sleepGoal} hours`
              : "No target set"
          }
          progress={sleepProgress}
          progressLabel="Sleep"
          accent="#8E82C7"
          fillerShape="moon"
          icon={<Moon size={18} />}
        />

        <MetricCard
          title="Hydration"
          value={
            hydration != null
              ? hydration
              : "—"
          }
          unit={
            hydration != null
              ? "L"
              : ""
          }
          description={
            hydrationGoal != null
              ? `Target ${hydrationGoal} L`
              : "No target set"
          }
          progress={
            hydrationProgress
          }
          progressLabel="Hydration"
          accent="#5BAFC0"
          fillerShape="droplet"
          icon={
            <Droplets size={18} />
          }
        />

        <MetricCard
          title="Workout"
          value={
            workoutCompletion != null
              ? Math.round(
                  workoutCompletion
                )
              : "—"
          }
          unit={
            workoutCompletion != null
              ? "%"
              : ""
          }
          description={
            workoutsThisWeek != null
              ? `${workoutsThisWeek} sessions this week`
              : "No sessions recorded"
          }
          progress={
            workoutCompletion ?? undefined
          }
          progressLabel="Completion"
          accent="#C19A5A"
          fillerShape="barbell"
          icon={
            <Dumbbell size={18} />
          }
        />
      </section>

      {/* Secondary metrics */}
      <section className="bf-client-secondary-grid">
        <MetricCard
          title="Active energy"
          value={
            calories != null
              ? calories
              : "—"
          }
          unit={
            calories != null
              ? "kcal"
              : ""
          }
          description={
            calories != null
              ? "Estimated activity energy"
              : "No activity data yet"
          }
          progress={calories != null ? Math.min(100, (Number(calories) / 500) * 100) : undefined}
          progressLabel="Of 500 kcal active goal"
          accent="#C98268"
          fillerShape="flame"
          icon={<Flame size={18} />}
          compact
        />

        <MetricCard
          title="Recovery"
          value={
            recovery != null
              ? Math.round(recovery)
              : "—"
          }
          unit={
            recovery != null
              ? "%"
              : ""
          }
          description={
            recovery != null
              ? "Daily readiness"
              : "No recovery data yet"
          }
          progress={
            recovery ?? undefined
          }
          progressLabel="Readiness"
          accent="#63B99B"
          fillerShape="heart"
          icon={
            <HeartPulse size={18} />
          }
          compact
        />

        <MetricCard
          title="Consistency"
          value={
            workoutsThisWeek != null
              ? workoutsThisWeek
              : "—"
          }
          unit={
            workoutsThisWeek != null
              ? "sessions"
              : ""
          }
          description={
            workoutsThisWeek != null
              ? "Completed this week"
              : "No workout history yet"
          }
          progress={workoutsThisWeek != null ? Math.min(100, (Number(workoutsThisWeek) / 4) * 100) : undefined}
          progressLabel="Weekly goal · 4 sessions"
          accent="#A59AD5"
          fillerShape="bolt"
          icon={<Trophy size={18} />}
          compact
        />

        <MetricCard
          title="Movement"
          value={
            stepProgress != null
              ? Math.round(
                  stepProgress
                )
              : "—"
          }
          unit={
            stepProgress != null
              ? "%"
              : ""
          }
          description={
            stepProgress != null
              ? "Daily movement target"
              : "No activity data yet"
          }
          progress={stepProgress}
          progressLabel="Goal"
          accent="#6DBBC3"
          fillerShape="footsteps"
          icon={
            <Activity size={18} />
          }
          compact
        />
      </section>

      {/* Weekly rhythm */}
      <section className="bf-weekly-card">
        <div className="bf-weekly-head">
          <div>
            <div className="bf-kicker">
              WEEKLY RHYTHM
            </div>

            <h4>
              {hasWeeklyData
                ? "Consistency over intensity."
                : "Your week will build here."}
            </h4>
          </div>

          <Sparkles size={17} />
        </div>

        {hasWeeklyData ? (
          <div className="bf-week-bars">
            {weeklyBars.map(
              (height, index) => (
                <div
                  key={index}
                  className="bf-week-column"
                >
                  <div className="bf-week-track">
                    <div
                      className="bf-week-fill"
                      style={{
                        height: `${height}%`,
                        background:
                          index === 6
                            ? "linear-gradient(180deg,#C19A5A,#7E6540)"
                            : "linear-gradient(180deg,#68C7A1,#356D57)",
                      }}
                    />
                  </div>

                  <span>
                    {
                      [
                        "M",
                        "T",
                        "W",
                        "T",
                        "F",
                        "S",
                        "S",
                      ][index]
                    }
                  </span>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="bf-week-empty">
            <span>
              No activity recorded this week yet.
            </span>
          </div>
        )}
      </section>

      <button
        className="bf-outline-action"
        type="button"
      >
        <span>
          Open detailed progress
        </span>

        <ChevronRight size={16} />
      </button>
    </section>
  );
}