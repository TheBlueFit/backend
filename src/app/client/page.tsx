"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, CalendarRange, TrendingUp } from "lucide-react";

import { GlassCard } from "@/components/GlassCard";
import ClientTrackerDashboard from "@/components/client/ClientTrackerDashboard";
import ProgressChart from "@/components/shared/ProgressChart";
import { dashboardAPI } from "@/services/api";
import type { AthleteDashboardData, AthleteProgressData, AthleteProgressRange } from "@/services/api";

const RANGE_OPTIONS: Array<{ value: AthleteProgressRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "1y", label: "Last 12 months" },
];

function localDateISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AthleteDashboard() {
  const [range, setRange] = useState<AthleteProgressRange>("today");
  const [dashboard, setDashboard] = useState<AthleteDashboardData | null>(null);
  const [progress, setProgress] = useState<AthleteProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const today = localDateISO();
        const [daily, historical] = await Promise.all([
          dashboardAPI.getAthleteData(undefined, today),
          dashboardAPI.getAthleteProgress(range, today),
        ]);

        if (!mounted) return;
        setDashboard(daily);
        setProgress(historical);
      } catch (err: any) {
        if (!mounted) return;
        console.error("Failed to fetch athlete dashboard:", err);
        setError(err?.message || "Unable to load your progress right now.");
        setDashboard(null);
        setProgress(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, [range]);

  const selectedMetrics = useMemo(() => {
    if (range === "today") {
      return dashboard;
    }

    if (!progress) return null;

    return {
      steps: progress.summary.averageSteps ?? undefined,
      stepGoal: 8000,
      sleepHours: progress.summary.averageSleepHours ?? undefined,
      sleepGoal: 7,
      hydration: progress.summary.averageHydration ?? undefined,
      hydrationGoal: 2.5,
      workoutCompletion: progress.summary.workoutCompletion ?? undefined,
      workoutsThisWeek: progress.summary.workoutsCompleted,
      recovery: undefined,
      calories: undefined,
    } as AthleteDashboardData;
  }, [dashboard, progress, range]);

  const chartData = progress?.daily ?? [];
  const hasHistoricalData = chartData.some(
    (point) =>
      point.steps != null ||
      point.sleepHours != null ||
      point.hydration != null ||
      point.weight != null ||
      point.adherence != null
  );

  return (
    <div className="container" style={{ maxWidth: "1180px", paddingBottom: "60px" }}>
      <div
        className="section-header"
        style={{
          marginBottom: "24px",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "20px",
        }}
      >
        <div>
          <div className="label-text" style={{ color: "var(--text-secondary)", marginBottom: "7px", letterSpacing: "0.16em" }}>
            ATHLETE INTELLIGENCE
          </div>
          <h2 className="animated-gradient-text" style={{ fontSize: "30px", textTransform: "none", marginBottom: "8px" }}>
            Your daily pulse
          </h2>
          <span className="label-text" style={{ color: "var(--text-secondary)", textTransform: "none" }}>
            Track movement, recovery and consistency without the noise.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "9px", flexShrink: 0 }}>
          <CalendarRange size={16} style={{ color: "var(--text-secondary)" }} />
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as AthleteProgressRange)}
            aria-label="Progress period"
            style={{
              minWidth: "150px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              padding: "10px 12px",
              borderRadius: "10px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: "18px", padding: "14px 16px", borderRadius: "12px", background: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.22)", color: "#FF8A83", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="app-card" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
          Loading your {range === "today" ? "daily" : "progress"} data...
        </div>
      ) : selectedMetrics ? (
        <>
          <ClientTrackerDashboard
            steps={selectedMetrics.steps}
            stepGoal={selectedMetrics.stepGoal}
            sleepHours={selectedMetrics.sleepHours}
            sleepGoal={selectedMetrics.sleepGoal}
            hydration={selectedMetrics.hydration}
            hydrationGoal={selectedMetrics.hydrationGoal}
            workoutCompletion={selectedMetrics.workoutCompletion}
            recovery={selectedMetrics.recovery}
            calories={selectedMetrics.calories}
            workoutsThisWeek={selectedMetrics.workoutsThisWeek}
          />

          {range !== "today" && progress && (
            <section className="app-card fade-in" style={{ marginTop: "24px", padding: "22px" }}>
              <div className="section-header" style={{ marginBottom: "8px", justifyContent: "space-between" }}>
                <div>
                  <div className="label-text" style={{ color: "var(--text-secondary)" }}>PROGRESS TREND</div>
                  <h3 style={{ fontSize: "17px", marginTop: "5px" }}>Your selected period</h3>
                </div>
                <TrendingUp size={18} style={{ color: "var(--accent-gold)" }} />
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)" }}>
                {formatDate(progress.from)} — {formatDate(progress.to)}
              </p>

              {!hasHistoricalData ? (
                <div style={{ padding: "30px 10px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                  No progress records were recorded during this period yet.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "18px" }}>
                  <div style={{ padding: "14px", borderRadius: "14px", background: "rgba(255,255,255,0.025)" }}>
                    <div className="label-text">STEPS</div>
                    <ProgressChart data={chartData as any} dataKey="steps" unit="steps" color="#68C7A1" />
                  </div>
                  <div style={{ padding: "14px", borderRadius: "14px", background: "rgba(255,255,255,0.025)" }}>
                    <div className="label-text">SLEEP</div>
                    <ProgressChart data={chartData as any} dataKey="sleepHours" unit="h" color="#8E82C7" />
                  </div>
                  <div style={{ padding: "14px", borderRadius: "14px", background: "rgba(255,255,255,0.025)" }}>
                    <div className="label-text">HYDRATION</div>
                    <ProgressChart data={chartData as any} dataKey="hydration" unit="L" color="#63B99B" />
                  </div>
                  <div style={{ padding: "14px", borderRadius: "14px", background: "rgba(255,255,255,0.025)" }}>
                    <div className="label-text">BODY WEIGHT</div>
                    <ProgressChart data={chartData as any} dataKey="weight" unit="kg" color="#C19A5A" />
                  </div>
                </div>
              )}
            </section>
          )}

          {range === "today" && (
            <div className="app-card fade-in" style={{ marginTop: "24px" }}>
              <div className="section-header" style={{ marginBottom: "18px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", marginBottom: "5px" }}>Today's training</h3>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Your assigned sessions for today.</span>
                </div>
              </div>

              {!dashboard?.todayTraining?.length ? (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)", borderRadius: "16px", background: "rgba(255,255,255,0.025)" }}>
                  No training scheduled for today yet.
                </div>
              ) : (
                <div className="plan-cards-container">
                  {dashboard.todayTraining.map((training: any) => (
                    <GlassCard
                      key={training.id}
                      title={training.title}
                      subtitle={training.subtitle}
                      statusText={training.statusText}
                      statusColor={training.statusColor}
                      Icon={String(training.statusText).toLowerCase() === "completed" ? CheckCircle2 : Clock}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
