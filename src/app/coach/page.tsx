"use client";

import React, { useEffect, useState } from "react";
import { Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import CoachTrackerDashboard from "@/components/coach/CoachTrackerDashboard";
import ClientStepsPanel from "@/components/coach/ClientStepsPanel";
import { authSession, CoachClient, dashboardAPI } from "@/services/api";

interface CoachDashboardData {
  stats: any[];
  recentActivity: any[];
  clients?: CoachClient[];
  summary?: { stepGoal?: number };
}

function getStat(stats: any[], names: string[]): number | undefined {
  const match = stats?.find((item) => {
    const name = String(item.name ?? item.title ?? item.label ?? "").toLowerCase();
    return names.some((candidate) => name.includes(candidate.toLowerCase()));
  });

  const value = Number(match?.value);
  return Number.isFinite(value) ? value : undefined;
}

export default function CoachDashboard() {
  const [currentUserName, setCurrentUserName] = useState("Coach");
  const [dashboardData, setDashboardData] = useState<CoachDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncCurrentUser = () => {
      setCurrentUserName(authSession.get()?.name?.trim() || "Coach");
    };

    syncCurrentUser();
    window.addEventListener("bluefit:auth-change", syncCurrentUser);
    return () => window.removeEventListener("bluefit:auth-change", syncCurrentUser);
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchDashboard = async () => {
      try {
        const data = await dashboardAPI.getCoachData();
        if (mounted) setDashboardData(data);
      } catch (error) {
        console.error("Failed to fetch coach data:", error);
        if (mounted) setDashboardData({ stats: [], recentActivity: [] });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchDashboard();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") fetchDashboard(); }, 60_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const stats = dashboardData?.stats ?? [];
  const activeClients = getStat(stats, ["active", "clients"]);
  const workoutCompletion = getStat(stats, ["workout", "completion"]);
  const sleepConsistency = getStat(stats, ["sleep", "consistency"]);
  const hydration = getStat(stats, ["hydration"]);
  const adherence = getStat(stats, ["adherence"]);

  return (
    <div
      className="container"
      style={{ maxWidth: "1180px", paddingBottom: "60px" }}
    >
      <div className="section-header" style={{ marginBottom: "30px" }}>
        <div>
          <div
            className="label-text"
            style={{
              color: "var(--text-secondary)",
              marginBottom: "7px",
              letterSpacing: "0.16em",
            }}
          >
            COACH INTELLIGENCE
          </div>

          <h2
            className="animated-gradient-text"
            style={{
              fontSize: "30px",
              textTransform: "none",
              marginBottom: "8px",
            }}
          >
            {`Welcome, ${currentUserName}`}
          </h2>

          <span
            className="label-text"
            style={{ color: "var(--text-secondary)", textTransform: "none" }}
          >
            A quick view of adherence, recovery and daily client activity.
          </span>
        </div>
      </div>

      <CoachTrackerDashboard
        activeClients={activeClients}
        workoutCompletion={workoutCompletion}
        sleepConsistency={sleepConsistency}
        hydration={hydration}
        adherence={adherence}
      />

      <ClientStepsPanel clients={dashboardData?.clients ?? []} goal={dashboardData?.summary?.stepGoal ?? 10000} loading={isLoading} />

      <section className="app-card fade-in" style={{ marginTop: "24px" }}>
        <div className="section-header" style={{ marginBottom: "18px" }}>
          <div>
            <h3 style={{ fontSize: "16px", marginBottom: "5px" }}>
              Recent client activity
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
              Recent actions across your training roster.
            </span>
          </div>
          <Activity size={18} />
        </div>

        {isLoading ? (
          <div
            style={{
              padding: "35px",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            Loading coach metrics...
          </div>
        ) : dashboardData?.recentActivity?.length ? (
          <div className="plan-cards-container">
            {dashboardData.recentActivity.map((activity: any) => {
              const completed = activity.status === "completed";

              return (
                <GlassCard
                  key={activity.id}
                  title={activity.client}
                  subtitle={activity.action}
                  statusText={activity.status}
                  statusColor={completed ? "green" : "red"}
                  Icon={completed ? CheckCircle2 : AlertCircle}
                />
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: "28px",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            No recent client activity.
          </div>
        )}
      </section>
    </div>
  );
}
