"use client";

/**
 * HealthSyncCard (v4 — Fix 5)
 * ────────────────────────────
 * Added a time-range toggle: Today / 7 Days / 30 Days.
 * The selected range controls the startDate passed to Health.readSamples().
 * All other behaviour (auto-sync on granted permission, in-flight guard,
 * iOS deferred, unavailable state) is unchanged.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Activity,
  RefreshCw,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Heart,
  Apple,
} from "lucide-react";

import { authSession } from "@/services/api";
import { usePermissions } from "@/components/shared/MobilePermissionsGate";

interface HealthReading {
  steps?: number;
  sleepHours?: number;
  calories?: number;
  heartRate?: number;
  lastSynced?: string;
}

type SyncState =
  | "idle"
  | "syncing"
  | "done"
  | "error"
  | "unavailable"
  | "needs-permission"
  | "ios-deferred";

// Fix 5: time-range options
type TimeRange = "today" | "7d" | "30d";

const RANGE_LABELS: Record<TimeRange, string> = {
  today: "Today",
  "7d": "7 Days",
  "30d": "30 Days",
};

function rangeStart(range: TimeRange): Date {
  const now = new Date();
  if (range === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  }
  const days = range === "7d" ? 7 : 30;
  return new Date(Date.now() - days * 24 * 3600 * 1000);
}

async function getNativePlatform(): Promise<"android" | "ios" | "web"> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    const p = Capacitor.getPlatform();
    if (p === "android") return "android";
    if (p === "ios") return "ios";
  } catch {}
  return "web";
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

async function postHealthMetrics(data: Omit<HealthReading, "lastSynced">) {
  const token = authSession.get()?.token;
  if (!token || !API_BASE_URL) return;
  await fetch(`${API_BASE_URL}/athlete/health-metrics`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export default function HealthSyncCard({ onSync }: { onSync?: (data: HealthReading) => void }) {
  const { permissions, requestPermission, isNative } = usePermissions();

  const [state, setState] = useState<SyncState>("idle");
  const [reading, setReading] = useState<HealthReading | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Fix 5: range state
  const [range, setRange] = useState<TimeRange>("today");

  const onSyncRef = useRef(onSync);
  useEffect(() => { onSyncRef.current = onSync; }, [onSync]);

  const syncInFlightRef = useRef(false);

  const trySync = useCallback(async (selectedRange: TimeRange = "today") => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setState("syncing");
    setErrorMsg(null);

    try {
      const platform = await getNativePlatform();
      if (platform === "ios") { setState("ios-deferred"); return; }

      const { Health } = await import("@capgo/capacitor-health").catch(() => {
        throw new Error("health_plugin_unavailable");
      });

      const available = await Health.isAvailable().catch(() => ({ available: false }));
      if (!(available as any).available) throw new Error("health_unavailable");

      await Health.requestAuthorization({ read: ["steps", "sleep", "calories", "heartRate"], write: [] });

      // Fix 5: use range-based start date
      const startDate = rangeStart(selectedRange).toISOString();
      const endDate = new Date().toISOString();

      const sleepStart =
        selectedRange === "today"
          ? new Date(Date.now() - 8 * 3600 * 1000).toISOString()
          : startDate;

      const [stepsRes, caloriesRes, sleepRes, hrRes] = await Promise.allSettled([
        Health.readSamples({ startDate, endDate, dataType: "steps" }),
        Health.readSamples({ startDate, endDate, dataType: "calories" }),
        Health.readSamples({ startDate: sleepStart, endDate, dataType: "sleep" }),
        Health.readSamples({ startDate, endDate, dataType: "heartRate" }),
      ]);

      const sumValues = (res: PromiseSettledResult<any>): number | undefined => {
        if (res.status !== "fulfilled") return undefined;
        const vals: any[] = res.value?.samples ?? [];
        if (!vals.length) return undefined;
        return vals.reduce((acc: number, item: any) => acc + (Number(item.value) || 0), 0);
      };

      const avgValues = (res: PromiseSettledResult<any>): number | undefined => {
        if (res.status !== "fulfilled") return undefined;
        const vals: any[] = res.value?.samples ?? [];
        if (!vals.length) return undefined;
        return Math.round(vals.reduce((acc: number, item: any) => acc + (Number(item.value) || 0), 0) / vals.length);
      };

      const steps = sumValues(stepsRes);
      const calRaw = sumValues(caloriesRes);
      const calories = calRaw != null ? Math.round(calRaw) : undefined;
      const sleepMins = sumValues(sleepRes);
      const sleepHours = sleepMins != null ? Math.round((sleepMins / 60) * 10) / 10 : undefined;
      const heartRate = avgValues(hrRes);

      const newReading: HealthReading = { steps, sleepHours, calories, heartRate, lastSynced: new Date().toISOString() };
      setReading(newReading);
      setState("done");

      postHealthMetrics({ steps, sleepHours, calories, heartRate }).catch(() => {});
      onSyncRef.current?.(newReading);
    } catch (err: any) {
      if (err?.message === "health_plugin_unavailable" || err?.message === "health_unavailable") {
        setState("unavailable");
      } else {
        setState("error");
        setErrorMsg(err?.message || "Could not read health data.");
      }
    } finally {
      syncInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (permissions.health === "granted") { trySync(range); return; }
    if (permissions.health === "denied") { setState("needs-permission"); return; }
    if (!isNative) { setState("unavailable"); return; }
  }, [permissions.health, isNative]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === "needs-permission" || (permissions.health === "prompt" && state === "idle")) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "rgba(229,184,105,0.06)", border: "1px solid rgba(229,184,105,0.25)", borderRadius: "var(--radius-md)" }}>
        <Heart size={18} color="#E5B869" />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: "0 0 2px" }}>Health sync needs permission</p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>Allow Health access to sync steps, sleep and heart-rate.</p>
        </div>
        <button type="button" onClick={async () => { await requestPermission("health"); trySync(range); }}
          style={{ padding: "8px 14px", background: "rgba(229,184,105,0.15)", border: "1px solid rgba(229,184,105,0.4)", borderRadius: 8, color: "#E5B869", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          Allow
        </button>
      </div>
    );
  }

  if (state === "ios-deferred") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", fontSize: 13 }}>
        <Apple size={16} /><span>Apple Health sync is coming soon. Check back in a future update.</span>
      </div>
    );
  }

  if (state === "unavailable") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", fontSize: 13 }}>
        <Smartphone size={16} /><span>Health data sync is available on Android. Open the app on your phone to sync.</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
      {/* Fix 5: Range toggle row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 3 }}>
          {(Object.keys(RANGE_LABELS) as TimeRange[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => { setRange(r); if (state !== "syncing") trySync(r); }}
              style={{
                padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 11,
                fontWeight: range === r ? 700 : 400, cursor: "pointer",
                background: range === r ? "rgba(229,184,105,0.18)" : "transparent",
                color: range === r ? "#E5B869" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {/* Sync button */}
        <button
          type="button"
          onClick={() => trySync(range)}
          disabled={state === "syncing"}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-subtle)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12, cursor: state === "syncing" ? "wait" : "pointer" }}
        >
          <RefreshCw size={13} style={{ animation: state === "syncing" ? "spin 1s linear infinite" : "none" }} />
          {state === "syncing" ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {/* Reading row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {state === "done"  && <CheckCircle2 size={15} color="var(--accent-green)" style={{ flexShrink: 0 }} />}
        {state === "error" && <AlertCircle  size={15} color="#f87171"             style={{ flexShrink: 0 }} />}
        {(state === "idle" || state === "syncing") && <Activity size={15} color="var(--accent-gold)" style={{ flexShrink: 0 }} />}

        <div>
          <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
            {state === "syncing" && `Syncing ${RANGE_LABELS[range].toLowerCase()} data…`}
            {state === "done" && reading && (
              <>
                {reading.steps     != null && `${reading.steps.toLocaleString()} steps`}
                {reading.sleepHours != null && ` · ${reading.sleepHours}h sleep`}
                {reading.calories   != null && ` · ${reading.calories} kcal`}
                {reading.heartRate  != null && ` · ${reading.heartRate} bpm`}
              </>
            )}
            {state === "idle"  && `Tap Sync to load ${RANGE_LABELS[range].toLowerCase()} data`}
            {state === "error" && (errorMsg || "Could not read health data")}
          </span>
          {state === "done" && reading?.lastSynced && (
            <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>
              Synced {new Date(reading.lastSynced).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {range !== "today" && ` · ${RANGE_LABELS[range]} view`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
