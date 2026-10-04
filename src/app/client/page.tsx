"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";

import { GlassCard } from "@/components/GlassCard";
import ClientTrackerDashboard from "@/components/client/ClientTrackerDashboard";
import HealthSyncCard from "@/components/shared/HealthSyncCard";
import ClientAssignedSchedules from "@/components/client/ClientAssignedSchedules";
import { authSession, dashboardAPI } from "@/services/api";

interface AthleteData {
  todayTraining: any[];
  steps?: number;
  stepGoal?: number;
  sleepHours?: number;
  sleepGoal?: number;
  hydration?: number;
  hydrationGoal?: number;
  workoutCompletion?: number;
  recovery?: number;
  calories?: number;
  workoutsThisWeek?: number;
  assignedSchedules?: any[];
}

export default function AthleteDashboard() {
  const [currentUserName, setCurrentUserName] = useState("Athlete");
  const [athleteData, setAthleteData] = useState<AthleteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncCurrentUser = () => {
      setCurrentUserName(authSession.get()?.name?.trim() || "Athlete");
    };

    syncCurrentUser();
    window.addEventListener("bluefit:auth-change", syncCurrentUser);
    return () => window.removeEventListener("bluefit:auth-change", syncCurrentUser);
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await dashboardAPI.getAthleteData();
      setAthleteData((prev) => ({ ...(prev ?? {}), ...data } as AthleteData));
    } catch {
      setAthleteData((prev) => prev ?? { todayTraining: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchDashboard().catch(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [fetchDashboard]);

  const handleHealthSync = (healthData: {
    steps?: number;
    sleepHours?: number;
    calories?: number;
    heartRate?: number;
  }) => {
    setAthleteData((prev) => ({
      ...(prev ?? { todayTraining: [] }),
      steps: healthData.steps ?? prev?.steps,
      sleepHours: healthData.sleepHours ?? prev?.sleepHours,
      calories: healthData.calories ?? prev?.calories,
      recovery: prev?.recovery,
    }));
  };

  return (
    <>
      <div className="container" style={{ maxWidth: "1180px", paddingBottom: "60px" }}>
        <div className="section-header" style={{ marginBottom: "30px", alignItems: "flex-end" }}>
          <div>
            <div className="label-text" style={{ color: "var(--text-secondary)", marginBottom: "7px", letterSpacing: "0.16em" }}>
              ATHLETE INTELLIGENCE
            </div>
            <h2 className="animated-gradient-text" style={{ fontSize: "30px", textTransform: "none", marginBottom: "8px" }}>
              {`Welcome, ${currentUserName}`}
            </h2>
            <span className="label-text" style={{ color: "var(--text-secondary)", textTransform: "none" }}>
              Track movement, recovery and consistency without the noise.
            </span>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <HealthSyncCard onSync={handleHealthSync} />
        </div>

        <ClientTrackerDashboard
          steps={athleteData?.steps}
          stepGoal={athleteData?.stepGoal}
          sleepHours={athleteData?.sleepHours}
          sleepGoal={athleteData?.sleepGoal}
          hydration={athleteData?.hydration}
          hydrationGoal={athleteData?.hydrationGoal}
          workoutCompletion={athleteData?.workoutCompletion}
          recovery={athleteData?.recovery}
          calories={athleteData?.calories}
          workoutsThisWeek={athleteData?.workoutsThisWeek}
        />

        {/* Assigned workout plans — opens schedule in an in-app iframe panel */}
        <ClientAssignedSchedules schedules={athleteData?.assignedSchedules} />

        <div className="app-card fade-in" style={{ marginTop: "24px" }}>
          <div className="section-header" style={{ marginBottom: "18px" }}>
            <div>
              <h3 style={{ fontSize: "16px", marginBottom: "5px" }}>Today's training</h3>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Your assigned sessions for today.</span>
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>Loading training plan…</div>
          ) : !athleteData?.todayTraining?.length ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)", borderRadius: "16px", background: "rgba(255,255,255,0.025)" }}>
              No training scheduled for today yet.
            </div>
          ) : (
            <div className="plan-cards-container">
              {athleteData.todayTraining.map((training: any) => (
                <GlassCard key={training.id} title={training.title} subtitle={training.subtitle} statusText={training.statusText} statusColor={training.statusColor} Icon={training.statusText === "completed" ? CheckCircle2 : Clock} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
