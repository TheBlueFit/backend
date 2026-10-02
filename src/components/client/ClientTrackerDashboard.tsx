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
import ProgressRing from "@/components/shared/ProgressRing";

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
  workoutsThisWeek?: number | null;
}

const clamp = (value: number) =>
  Math.min(100, Math.max(0, Number(value) || 0));

function ConcentricRings({
  steps,
  sleep,
  activity,
}: {
  steps?: number | null;
  sleep?: number | null;
  activity?: number | null;
}) {
  const rawValues: Array<number | null> = [
    steps ?? null,
    sleep ?? null,
    activity ?? null,
  ];

  const colors = ["#68C7A1", "#8E82C7", "#C19A5A"];

  const rings = [
    { radius: 82, width: 9 },
    { radius: 65, width: 8 },
    { radius: 48, width: 8 },
  ];

  const [animated, setAnimated] = useState([0, 0, 0]);

  useEffect(() => {
    let frame = 0;

    const start = performance.now();
    const duration = 950;

    setAnimated([0, 0, 0]);

    const animate = (time: number) => {
      const ratio = Math.min(
        (time - start) / duration,
        1
      );

      const eased = 1 - Math.pow(1 - ratio, 3);

      setAnimated(
        rawValues.map((value) =>
          value == null
            ? 0
            : clamp(value) * eased
        )
      );

      if (ratio < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [steps, sleep, activity]);

  const hasAnyData = rawValues.some(
    (value) => value != null
  );

  const size = 205;
  const center = size / 2;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
      }}
      aria-label="Daily movement, sleep and training progress"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          overflow: "visible",
          transform: "rotate(-90deg)",
        }}
        aria-hidden="true"
      >
        {rings.map((ring, index) => {
          const circumference =
            2 * Math.PI * ring.radius;

          const dashOffset =
            circumference -
            (animated[index] / 100) *
              circumference;

          const hasValue =
            rawValues[index] != null;

          return (
            <g key={ring.radius}>
              <circle
                cx={center}
                cy={center}
                r={ring.radius}
                fill="none"
                stroke="rgba(255,255,255,0.045)"
                strokeWidth={ring.width}
              />

              {hasValue && (
                <circle
                  cx={center}
                  cy={center}
                  r={ring.radius}
                  fill="none"
                  stroke={colors[index]}
                  strokeWidth={ring.width}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{
                    transition:
                      "stroke-dashoffset 70ms linear",
                    filter: `drop-shadow(0 0 4px ${colors[index]}2b)`,
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "31px",
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.05em",
            color: "var(--text-primary)",
          }}
        >
          {hasAnyData
            ? `${Math.round(animated[2])}%`
            : "—"}
        </div>

        <div
          style={{
            marginTop: "6px",
            fontSize: "9px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          {hasAnyData
            ? "Daily pulse"
            : "No activity yet"}
        </div>
      </div>
    </div>
  );
}

function PulseLegend({
  color,
  title,
  value,
  detail,
}: {
  color: string;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "10px minmax(0,1fr) auto",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <span
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "999px",
          background: color,
          opacity:
            value === "—" ? 0.25 : 1,
          boxShadow: `0 0 7px ${color}44`,
        }}
      />

      <div>
        <div
          style={{
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.09em",
            color: "var(--text-secondary)",
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: "3px",
            fontSize: "11px",
            color: "rgba(255,255,255,0.46)",
          }}
        >
          {detail}
        </div>
      </div>

      <strong
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color:
            value === "—"
              ? "var(--text-secondary)"
              : "rgba(255,255,255,0.82)",
        }}
      >
        {value}
      </strong>
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
      {/* Primary health overview */}
      <section className="bf-premium-overview">
        <div
          className="bf-overview-glow"
          aria-hidden="true"
        />

        <div className="bf-overview-copy">
          <div className="bf-kicker">
            HEALTH OVERVIEW
          </div>

          <h3>Today's rhythm</h3>

          <p>
            {hasAnyData
              ? "Movement, recovery and training — brought together into one quiet daily signal."
              : "Your personal activity will appear here as you train, move, recover and check in."}
          </p>

          <div className="bf-pulse-legend">
            <PulseLegend
              color="#68C7A1"
              title="Movement"
              value={
                steps != null
                  ? steps.toLocaleString()
                  : "—"
              }
              detail={
                stepProgress != null &&
                stepGoal != null
                  ? `${Math.round(
                      stepProgress
                    )}% of step goal`
                  : "No activity data yet"
              }
            />

            <PulseLegend
              color="#8E82C7"
              title="Sleep"
              value={
                sleepHours != null
                  ? `${sleepHours.toFixed(
                      1
                    )}h`
                  : "—"
              }
              detail={
                sleepProgress != null
                  ? `${Math.round(
                      sleepProgress
                    )}% of target`
                  : "No sleep data yet"
              }
            />

            <PulseLegend
              color="#C19A5A"
              title="Training"
              value={
                workoutCompletion != null
                  ? `${Math.round(
                      workoutCompletion
                    )}%`
                  : "—"
              }
              detail={
                workoutCompletion != null
                  ? "weekly completion"
                  : "No workout data yet"
              }
            />
          </div>
        </div>

        <div className="bf-overview-rings">
          <ConcentricRings
            steps={stepProgress}
            sleep={sleepProgress}
            activity={
              workoutCompletion
            }
          />

          <div className="bf-ring-caption">
            <span>Movement</span>
            <span>Sleep</span>
            <span>Training</span>
          </div>
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

        <ProgressRing
          value={
            recovery != null
              ? recovery
              : undefined
          }
          size={90}
          strokeWidth={6}
          label="Recovery"
          accent="#63B99B"
          glow={1}
        />
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
          accent="#C98268"
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
          accent="#A59AD5"
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