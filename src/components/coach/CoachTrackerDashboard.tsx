"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Droplets,
  Dumbbell,
  HeartPulse,
  Moon,
  TrendingUp,
  Users,
} from "lucide-react";

import MetricCard from "@/components/shared/MetricCard";
import ProgressRing from "@/components/shared/ProgressRing";

interface CoachTrackerDashboardProps {
  activeClients?: number;
  workoutCompletion?: number;
  sleepConsistency?: number;
  hydration?: number;
  adherence?: number;
}

const clamp = (value: number) => Math.min(100, Math.max(0, Number(value) || 0));

function CoachPulseRings({
  adherence,
  workout,
  recovery,
}: {
  adherence?: number;
  workout?: number;
  recovery?: number;
}) {
  const rawValues: Array<number | undefined> = [adherence, workout, recovery];
  const colors = ["#63B99B", "#C19A5A", "#8E82C7"];
  const radii = [78, 60, 43];
  const widths = [9, 8, 8];
  const size = 195;
  const center = size / 2;
  const [animated, setAnimated] = useState([0, 0, 0]);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 950;

    setAnimated([0, 0, 0]);

    const animate = (time: number) => {
      const ratio = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);
      setAnimated(
        rawValues.map((value) =>
          value === undefined ? 0 : clamp(value) * eased
        )
      );
      if (ratio < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [adherence, workout, recovery]);

  const hasAnyData = rawValues.some((value) => value !== undefined);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)", overflow: "visible" }}
        aria-hidden="true"
      >
        {radii.map((radius, index) => {
          const circumference = 2 * Math.PI * radius;
          const offset =
            circumference - (animated[index] / 100) * circumference;
          const hasValue = rawValues[index] !== undefined;

          return (
            <g key={radius}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.045)"
                strokeWidth={widths[index]}
              />

              {hasValue && (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={colors[index]}
                  strokeWidth={widths[index]}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  style={{
                    transition: "stroke-dashoffset 70ms linear",
                    filter: `drop-shadow(0 0 4px ${colors[index]}22)`,
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: "30px",
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.05em",
            color: "var(--text-primary)",
          }}
        >
          {hasAnyData ? `${Math.round(animated[0])}%` : "—"}
        </span>

        <span
          style={{
            marginTop: "6px",
            fontSize: "9px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          {hasAnyData ? "Client pulse" : "No client data"}
        </span>
      </div>
    </div>
  );
}

function CoachLegend({
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
        gridTemplateColumns: "10px minmax(0,1fr) auto",
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
          opacity: value === "—" ? 0.25 : 1,
          boxShadow: `0 0 7px ${color}33`,
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

function Signal({
  icon: Icon,
  title,
  value,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bf-signal">
      <div
        className="bf-signal-icon"
        style={{
          color: accent,
          background: `${accent}0f`,
          borderColor: `${accent}18`,
        }}
      >
        <Icon size={15} />
      </div>
      <div>
        <div className="bf-signal-title">{title}</div>
        <div className="bf-signal-value">{value}</div>
      </div>
    </div>
  );
}

export default function CoachTrackerDashboard({
  activeClients,
  workoutCompletion,
  sleepConsistency,
  hydration,
  adherence,
}: CoachTrackerDashboardProps) {
  const hasAnyData =
    activeClients !== undefined ||
    workoutCompletion !== undefined ||
    sleepConsistency !== undefined ||
    hydration !== undefined ||
    adherence !== undefined;

  const hasWeeklyData =
    adherence !== undefined || workoutCompletion !== undefined;

  const [weeklyBars, setWeeklyBars] = useState([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    if (!hasWeeklyData) {
      setWeeklyBars([0, 0, 0, 0, 0, 0, 0]);
      return () => undefined;
    }

    let frame = 0;
    const start = performance.now();
    const duration = 850;
    const finalValue = clamp(adherence ?? workoutCompletion ?? 0);

    const animate = (time: number) => {
      const ratio = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);
      setWeeklyBars([
        0,
        0,
        0,
        0,
        0,
        0,
        finalValue * eased,
      ]);
      if (ratio < 1) frame = requestAnimationFrame(animate);
    };

    setWeeklyBars([0, 0, 0, 0, 0, 0, 0]);
    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [adherence, workoutCompletion, hasWeeklyData]);

  return (
    <section className="bf-coach-tracker">
      {/* Main client pulse */}
      <section className="bf-coach-overview">
        <div className="bf-coach-overview-glow" aria-hidden="true" />

        <div className="bf-coach-copy">
          <div className="bf-kicker">CLIENT HEALTH OVERVIEW</div>
          <h3>Training pulse.</h3>
          <p>
            {hasAnyData
              ? "One calm view of adherence, training, recovery and hydration across your current roster."
              : "Client activity will appear here as athletes are assigned and begin recording their progress."}
          </p>

          <div className="bf-coach-legend">
            <CoachLegend
              color="#63B99B"
              title="Adherence"
              value={adherence !== undefined ? `${Math.round(adherence)}%` : "—"}
              detail={adherence !== undefined ? "weekly rhythm" : "No data yet"}
            />

            <CoachLegend
              color="#C19A5A"
              title="Training"
              value={
                workoutCompletion !== undefined
                  ? `${Math.round(workoutCompletion)}%`
                  : "—"
              }
              detail={
                workoutCompletion !== undefined
                  ? "sessions completed"
                  : "No data yet"
              }
            />

            <CoachLegend
              color="#8E82C7"
              title="Recovery"
              value={
                sleepConsistency !== undefined
                  ? `${Math.round(sleepConsistency)}%`
                  : "—"
              }
              detail={
                sleepConsistency !== undefined
                  ? "sleep consistency"
                  : "No data yet"
              }
            />
          </div>
        </div>

        <div className="bf-coach-rings">
          <CoachPulseRings
            adherence={adherence}
            workout={workoutCompletion}
            recovery={sleepConsistency}
          />

          <div className="bf-coach-ring-caption">
            <span>Adherence</span>
            <span>Training</span>
            <span>Recovery</span>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="bf-coach-metric-grid">
        <MetricCard
          title="Active clients"
          value={activeClients !== undefined ? activeClients : "—"}
          description={
            activeClients !== undefined
              ? "currently training"
              : "No clients assigned"
          }
          accent="#68AFC3"
          icon={<Users size={18} />}
        />

        <MetricCard
          title="Workout completion"
          value={
            workoutCompletion !== undefined
              ? Math.round(clamp(workoutCompletion))
              : "—"
          }
          unit={workoutCompletion !== undefined ? "%" : ""}
          description={
            workoutCompletion !== undefined
              ? "scheduled sessions completed"
              : "No workout data yet"
          }
          progress={workoutCompletion}
          progressLabel="Completion"
          accent="#B89257"
          icon={<Dumbbell size={18} />}
        />

        <MetricCard
          title="Sleep consistency"
          value={
            sleepConsistency !== undefined
              ? Math.round(clamp(sleepConsistency))
              : "—"
          }
          unit={sleepConsistency !== undefined ? "%" : ""}
          description={
            sleepConsistency !== undefined
              ? "clients meeting recovery target"
              : "No recovery data yet"
          }
          progress={sleepConsistency}
          progressLabel="Consistency"
          accent="#887DBC"
          icon={<Moon size={18} />}
        />

        <MetricCard
          title="Hydration"
          value={hydration !== undefined ? Math.round(clamp(hydration)) : "—"}
          unit={hydration !== undefined ? "%" : ""}
          description={
            hydration !== undefined
              ? "clients near daily target"
              : "No hydration data yet"
          }
          progress={hydration}
          progressLabel="Hydration"
          accent="#579FAC"
          icon={<Droplets size={18} />}
        />
      </section>

      {/* Signals */}
      <section className="bf-coach-signal-card">
        <div className="bf-coach-signal-head">
          <div>
            <div className="bf-kicker">CLIENT SIGNALS</div>
            <h4>Where to look next.</h4>
          </div>
          <Activity size={17} />
        </div>

        <div className="bf-coach-signal-grid">
          <Signal
            icon={CheckCircle2}
            title="Sessions on track"
            value={
              workoutCompletion !== undefined
                ? `${Math.round(clamp(workoutCompletion))}%`
                : "—"
            }
            accent="#B89257"
          />

          <Signal
            icon={HeartPulse}
            title="Recovery"
            value={
              sleepConsistency === undefined
                ? "—"
                : sleepConsistency < 70
                  ? "Needs review"
                  : "Stable"
            }
            accent={
              sleepConsistency !== undefined && sleepConsistency < 70
                ? "#C98268"
                : "#63B99B"
            }
          />

          <Signal
            icon={TrendingUp}
            title="Weekly adherence"
            value={
              adherence !== undefined
                ? `${Math.round(clamp(adherence))}%`
                : "—"
            }
            accent="#63B99B"
          />
        </div>
      </section>

      {/* Weekly trend */}
      <section className="bf-weekly-card">
        <div className="bf-weekly-head">
          <div>
            <div className="bf-kicker">ROSTER RHYTHM</div>
            <h4>
              {hasWeeklyData
                ? "Consistency over intensity."
                : "Your roster rhythm will build here."}
            </h4>
          </div>
          <TrendingUp size={17} />
        </div>

        {hasWeeklyData ? (
          <div className="bf-week-bars">
            {weeklyBars.map((height, index) => (
              <div className="bf-week-column" key={index}>
                <div className="bf-week-track">
                  <div
                    className="bf-week-fill"
                    style={{
                      height: `${height}%`,
                      background:
                        index === 6
                          ? "linear-gradient(180deg,#B89257,#725A38)"
                          : "linear-gradient(180deg,#68AFC3,#315E67)",
                    }}
                  />
                </div>
                <span>{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bf-week-empty">
            <span>No client activity recorded yet.</span>
          </div>
        )}
      </section>
    </section>
  );
}
