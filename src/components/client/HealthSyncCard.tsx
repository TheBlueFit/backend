"use client";
/**
 * HealthSyncCard
 * ──────────────
 * Reads step count, sleep, active calories and heart rate from the device
 * health platform (Health Connect on Android / Apple Health via HealthKit on iOS)
 * using the Capacitor Health plugin, then posts the data to the backend.
 *
 * On desktop / web browsers it shows a "not available" state instead of crashing.
 *
 * Install:
 *   npm install @capacitor-community/health
 *   npx cap sync
 *
 * Add permissions in AndroidManifest.xml and Info.plist as the plugin docs describe.
 */

import React, { useCallback, useEffect, useState } from "react";
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

function todayRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  return { startDate: start.toISOString(), endDate: now.toISOString() };
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
    setState("syncing");
    setErrorMsg(null);

    try {
      // Dynamic import so the build doesn't break on web where the plugin isn't installed
      const { Health } = await import("@capacitor-community/health").catch(() => {
        throw new Error("health_plugin_unavailable");
      });

      // Check / request permissions
      const available = await Health.isAvailable().catch(() => ({ available: false }));
      if (!(available as any).available) throw new Error("health_unavailable");

      await Health.requestAuthorization({
        read: ["steps", "activity", "sleep", "calories", "heart_rate"],
        write: [],
      });

      const { startDate, endDate } = todayRange();

      const [stepsRes, caloriesRes, sleepRes, hrRes] = await Promise.allSettled([
        Health.query({ startDate, endDate, dataType: "steps" }),
        Health.query({ startDate, endDate, dataType: "calories" }),
        Health.query({ startDate: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), endDate, dataType: "sleep" }),
        Health.query({ startDate, endDate, dataType: "heart_rate" }),
      ]);

      const sumValues = (res: PromiseSettledResult<any>): number | undefined => {
        if (res.status !== "fulfilled") return undefined;
        const vals: any[] = res.value?.value ?? [];
        if (!vals.length) return undefined;
        return vals.reduce((acc: number, item: any) => acc + (Number(item.value) || 0), 0);
      };

      const avgValues = (res: PromiseSettledResult<any>): number | undefined => {
        if (res.status !== "fulfilled") return undefined;
        const vals: any[] = res.value?.value ?? [];
        if (!vals.length) return undefined;
        const sum = vals.reduce((acc: number, item: any) => acc + (Number(item.value) || 0), 0);
        return Math.round(sum / vals.length);
      };

      const steps = sumValues(stepsRes);
      const calories = sumValues(caloriesRes) ? Math.round(sumValues(caloriesRes)!) : undefined;
      const sleepMins = sumValues(sleepRes);
      const sleepHours = sleepMins != null ? Math.round((sleepMins / 60) * 10) / 10 : undefined;
      const heartRate = avgValues(hrRes);

      const newReading: HealthReading = {
        steps,
        sleepHours,
        calories,
        heartRate,
        lastSynced: new Date().toISOString(),
      };

      setReading(newReading);
      setState("done");

      // Post to backend (best-effort — never blocks the UI)
      postHealthMetrics({ steps, sleepHours, calories, heartRate }).catch(() => {});

      onSync?.(newReading);
    } catch (err: any) {
      if (err?.message === "health_plugin_unavailable" || err?.message === "health_unavailable") {
        setState("unavailable");
      } else {
        setState("error");
        setErrorMsg(err?.message || "Could not read health data.");
      }
    }
  }, [onSync]);

  // Auto-sync once on mount
  useEffect(() => {
    trySync();
  }, [trySync]);

  if (state === "unavailable") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", fontSize: "13px" }}>
        <Smartphone size={16} />
        <span>Health data is available on iPhone and Android. Open the app on your phone to sync.</span>
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
        onMouseOver={(e) => { e.currentTarget.style.borderColor = "rgba(229,184,105,0.4)"; }}
        onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
      >
        <RefreshCw size={13} style={{ animation: state === "syncing" ? "spin 1s linear infinite" : "none" }} />
        {state === "syncing" ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}
