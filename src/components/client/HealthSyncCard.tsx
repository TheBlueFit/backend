"use client";

/**
 * HealthSyncCard
 *
 * Uses the official Capacitor Health & Fitness plugin for Health Connect
 * (Android) / HealthKit (iOS). The plugin is only loaded on native devices;
 * browser builds show an unavailable state instead of failing the build.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Activity, RefreshCw, Smartphone, CheckCircle2, AlertCircle } from "lucide-react";
import { authSession } from "@/services/api";

interface HealthReading {
  steps?: number;
  sleepHours?: number;
  calories?: number;
  heartRate?: number;
  lastSynced?: string;
}

type SyncState = "idle" | "syncing" | "done" | "error" | "unavailable";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

async function postHealthMetrics(data: Omit<HealthReading, "lastSynced">) {
  const token = authSession.get()?.token;
  if (!token || !API_BASE_URL) return;

  await fetch(`${API_BASE_URL}/athlete/health-metrics`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}

function isoDate(d: Date): string {
  return d.toISOString().split(".")[0] + "Z";
}

function todayRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  return { startDate: isoDate(start), endDate: isoDate(now) };
}

function numericValues(value: unknown): number[] {
  const found: number[] = [];

  const walk = (node: unknown) => {
    if (typeof node === "number" && Number.isFinite(node)) {
      found.push(node);
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      for (const [key, child] of Object.entries(obj)) {
        if (["value", "Value", "numericValue", "NumericValue"].includes(key)) {
          if (typeof child === "number" && Number.isFinite(child)) found.push(child);
        } else if (typeof child === "object" && child !== null) {
          walk(child);
        }
      }
    }
  };

  walk(value);
  return found;
}

async function readHealthData(HealthFitness: any) {
  const { startDate, endDate } = todayRange();
  const sleepStart = isoDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const query = (variable: string, start: string = startDate) =>
    HealthFitness.getData({
      parameters: JSON.stringify({
        Variable: variable,
        StartDate: start,
        EndDate: endDate,
        TimeUnit: "DAY",
        OperationType: "SUM",
        TimeUnitLength: 1,
        AdvancedQueryReturnType: "ALL_DATA",
        AdvancedQueryResultType: "RAW_DATA",
      }),
    });

  const [stepsRes, caloriesRes, sleepRes, hrRes] = await Promise.allSettled([
    query("STEPS"),
    query("CALORIES_BURNED"),
    query("SLEEP", sleepStart),
    query("HEART_RATE"),
  ]);

  const readValues = (res: PromiseSettledResult<any>): number[] => {
    if (res.status !== "fulfilled") return [];

    const rawResults = res.value?.results;
    if (typeof rawResults === "string") {
      try {
        return numericValues(JSON.parse(rawResults));
      } catch {
        return numericValues(rawResults);
      }
    }

    return numericValues(rawResults);
  };

  const stepsValues = readValues(stepsRes);
  const caloriesValues = readValues(caloriesRes);
  const sleepValues = readValues(sleepRes);
  const hrValues = readValues(hrRes);

  const sum = (values: number[]) =>
    values.length ? values.reduce((total, value) => total + value, 0) : undefined;

  const average = (values: number[]) =>
    values.length ? values.reduce((total, value) => total + value, 0) / values.length : undefined;

  const steps = sum(stepsValues);
  const caloriesRaw = sum(caloriesValues);
  const sleepRaw = sum(sleepValues);
  const heartRateRaw = average(hrValues);

  // Health Connect sleep duration is represented in time units by the native
  // provider; preserve the existing Blue Fit convention of minutes -> hours.
  const sleepHours =
    sleepRaw != null
      ? sleepRaw > 24
        ? Math.round((sleepRaw / 60) * 10) / 10
        : Math.round(sleepRaw * 10) / 10
      : undefined;

  return {
    steps: steps != null ? Math.round(steps) : undefined,
    calories: caloriesRaw != null ? Math.round(caloriesRaw) : undefined,
    sleepHours,
    heartRate: heartRateRaw != null ? Math.round(heartRateRaw) : undefined,
  } satisfies Omit<HealthReading, "lastSynced">;
}

export default function HealthSyncCard({
  onSync,
}: {
  onSync?: (data: HealthReading) => void;
}) {
  const [state, setState] = useState<SyncState>("idle");
  const [reading, setReading] = useState<HealthReading | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const trySync = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setState("unavailable");
      return;
    }

    setState("syncing");
    setErrorMsg(null);

    try {
      const { HealthFitness } = await import("@capacitor/health-fitness");

      await HealthFitness.requestHealthPermissions({
        customPermissions: JSON.stringify([
          { Variable: "STEPS", AccessType: "READ" },
          { Variable: "CALORIES_BURNED", AccessType: "READ" },
          { Variable: "SLEEP", AccessType: "READ" },
          { Variable: "HEART_RATE", AccessType: "READ" },
        ]),
        allVariables: JSON.stringify({ IsActive: false, AccessType: "READ" }),
        fitnessVariables: JSON.stringify({ IsActive: false, AccessType: "READ" }),
        healthVariables: JSON.stringify({ IsActive: false, AccessType: "READ" }),
        profileVariables: JSON.stringify({ IsActive: false, AccessType: "READ" }),
        workoutVariables: JSON.stringify({ IsActive: false, AccessType: "READ" }),
      });

      const metrics = await readHealthData(HealthFitness);
      const newReading: HealthReading = {
        ...metrics,
        lastSynced: new Date().toISOString(),
      };

      setReading(newReading);
      setState("done");

      postHealthMetrics(metrics).catch(() => {});
      onSync?.(newReading);
    } catch (err: any) {
      setState("error");
      setErrorMsg(err?.message || "Could not read health data.");
    }
  }, [onSync]);

  useEffect(() => {
    trySync();
  }, [trySync]);

  if (state === "unavailable") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", fontSize: "13px" }}>
        <Smartphone size={16} />
        <span>Health data is available in the native Android/iPhone app. Open the app on your phone to sync.</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {state === "done" ? (
          <CheckCircle2 size={16} color="var(--accent-green)" />
        ) : state === "error" ? (
          <AlertCircle size={16} color="#f87171" />
        ) : (
          <Activity size={16} color="var(--accent-gold)" style={{ animation: state === "syncing" ? "pulse 1s infinite" : "none" }} />
        )}

        <div>
          <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
            {state === "syncing" && "Reading health data…"}
            {state === "done" && reading && (
              <>
                {reading.steps != null && `${reading.steps.toLocaleString()} steps`}
                {reading.sleepHours != null && ` · ${reading.sleepHours} h sleep`}
                {reading.calories != null && ` · ${reading.calories} kcal`}
                {reading.heartRate != null && ` · ${reading.heartRate} bpm`}
              </>
            )}
            {state === "idle" && "Tap to sync today's health data"}
            {state === "error" && (errorMsg || "Could not read health data")}
          </span>
          {state === "done" && reading?.lastSynced && (
            <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block" }}>
              Synced {new Date(reading.lastSynced).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={trySync}
        disabled={state === "syncing"}
        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "12px", cursor: state === "syncing" ? "wait" : "pointer", transition: "border-color 0.2s" }}
      >
        <RefreshCw size={13} style={{ animation: state === "syncing" ? "spin 1s linear infinite" : "none" }} />
        {state === "syncing" ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}
