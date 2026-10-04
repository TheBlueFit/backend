"use client";

/**
 * HealthSyncCard (v3)
 * ───────────────────
 * Reads health data from Google Health Connect via Capacitor.
 *
 * Behaviour:
 * - Automatically syncs once when health permission is already granted.
 * - Does not repeatedly re-trigger sync when the parent re-renders.
 * - Prevents concurrent sync requests.
 * - Manual "Sync now" remains available after the first sync.
 * - iOS remains intentionally deferred for this release.
 * - Web / unavailable devices show an unavailable state.
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

// "ios-deferred" = iOS Health sync intentionally out of scope for this release
type SyncState =
  | "idle"
  | "syncing"
  | "done"
  | "error"
  | "unavailable"
  | "needs-permission"
  | "ios-deferred";

// ── Platform helper ───────────────────────────────────────────────────────────
async function getNativePlatform(): Promise<
  "android" | "ios" | "web"
> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    const p = Capacitor.getPlatform();

    if (p === "android") return "android";
    if (p === "ios") return "ios";
  } catch {
    // Fall through to web.
  }

  return "web";
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || ""
).replace(/\/$/, "");

// ── Backend health metric sync ────────────────────────────────────────────────
async function postHealthMetrics(
  data: Omit<HealthReading, "lastSynced">
) {
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

// ── Today's date range ────────────────────────────────────────────────────────
function todayRange(): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0
  );

  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  };
}

export default function HealthSyncCard({
  onSync,
}: {
  onSync?: (data: HealthReading) => void;
}) {
  const { permissions, requestPermission, isNative } =
    usePermissions();

  const [state, setState] = useState<SyncState>("idle");
  const [reading, setReading] =
    useState<HealthReading | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /**
   * Keep the latest callback without making trySync depend on it.
   *
   * This is important because parent components may create a new
   * onSync function on every render. If trySync depended directly
   * on onSync, the auto-sync effect could fire repeatedly.
   */
  const onSyncRef = useRef(onSync);

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  /**
   * Prevent two sync operations from running at the same time.
   */
  const syncInFlightRef = useRef(false);

  const trySync = useCallback(async () => {
    // Do not start another request while one is already running.
    if (syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;

    setState("syncing");
    setErrorMsg(null);

    try {
      // ── iOS: out of scope for this release ──────────────────────────────
      const platform = await getNativePlatform();

      if (platform === "ios") {
        setState("ios-deferred");
        return;
      }

      // ── Load Health Connect plugin ───────────────────────────────────────
      const { Health } = await import(
        "@capgo/capacitor-health"
      ).catch(() => {
        throw new Error("health_plugin_unavailable");
      });

      // ── Check availability ───────────────────────────────────────────────
      const available = await Health.isAvailable().catch(() => ({
        available: false,
      }));

      if (!(available as any).available) {
        throw new Error("health_unavailable");
      }

      // ── Request / verify Health Connect authorization ────────────────────
      await Health.requestAuthorization({
        read: [
          "steps",
          "sleep",
          "calories",
          "heartRate",
        ],
        write: [],
      });

      // ── Read today's metrics ─────────────────────────────────────────────
      const { startDate, endDate } = todayRange();

      const [stepsRes, caloriesRes, sleepRes, hrRes] =
        await Promise.allSettled([
          Health.readSamples({
            startDate,
            endDate,
            dataType: "steps",
          }),

          Health.readSamples({
            startDate,
            endDate,
            dataType: "calories",
          }),

          // Sleep covers the previous 8 hours so overnight sleep
          // can still be included when syncing in the morning.
          Health.readSamples({
            startDate: new Date(
              Date.now() - 8 * 3600 * 1000
            ).toISOString(),
            endDate,
            dataType: "sleep",
          }),

          Health.readSamples({
            startDate,
            endDate,
            dataType: "heartRate",
          }),
        ]);

      // ── Helpers for Capgo Health readSamples() results ───────────────────
      const sumValues = (
        res: PromiseSettledResult<any>
      ): number | undefined => {
        if (res.status !== "fulfilled") {
          return undefined;
        }

        const vals: any[] =
          res.value?.samples ?? [];

        if (!vals.length) {
          return undefined;
        }

        const total = vals.reduce(
          (acc: number, item: any) =>
            acc + (Number(item.value) || 0),
          0
        );

        return total;
      };

      const avgValues = (
        res: PromiseSettledResult<any>
      ): number | undefined => {
        if (res.status !== "fulfilled") {
          return undefined;
        }

        const vals: any[] =
          res.value?.samples ?? [];

        if (!vals.length) {
          return undefined;
        }

        const average =
          vals.reduce(
            (acc: number, item: any) =>
              acc + (Number(item.value) || 0),
            0
          ) / vals.length;

        return Math.round(average);
      };

      // ── Calculate metrics ────────────────────────────────────────────────
      const steps = sumValues(stepsRes);

      const calRaw = sumValues(caloriesRes);
      const calories =
        calRaw != null
          ? Math.round(calRaw)
          : undefined;

      const sleepMins = sumValues(sleepRes);
      const sleepHours =
        sleepMins != null
          ? Math.round((sleepMins / 60) * 10) / 10
          : undefined;

      const heartRate = avgValues(hrRes);

      // ── Build reading ────────────────────────────────────────────────────
      const newReading: HealthReading = {
        steps,
        sleepHours,
        calories,
        heartRate,
        lastSynced: new Date().toISOString(),
      };

      setReading(newReading);
      setState("done");

      // Push metrics to backend so dashboard cards do not
      // need to query the device again.
      postHealthMetrics({
        steps,
        sleepHours,
        calories,
        heartRate,
      }).catch(() => {
        // Backend sync failure should not make the local
        // Health Connect read appear to have failed.
      });

      // Always use the latest callback from the parent.
      onSyncRef.current?.(newReading);
    } catch (err: any) {
      if (
        err?.message === "health_plugin_unavailable" ||
        err?.message === "health_unavailable"
      ) {
        setState("unavailable");
      } else {
        setState("error");
        setErrorMsg(
          err?.message ||
            "Could not read health data."
        );
      }
    } finally {
      // Always release the lock, including early returns/errors.
      syncInFlightRef.current = false;
    }
  }, []);

  // ── Permission / initial sync lifecycle ──────────────────────────────────
  useEffect(() => {
    // Only auto-sync when permission is already granted.
    //
    // IMPORTANT:
    // trySync is intentionally NOT part of this dependency array.
    // It is stable (useCallback with []) and does not depend on
    // the parent's onSync callback.
    if (permissions.health === "granted") {
      trySync();
      return;
    }

    if (permissions.health === "denied") {
      setState("needs-permission");
      return;
    }

    if (!isNative) {
      setState("unavailable");
      return;
    }

    // "unknown" / "prompt":
    // wait for the user to grant permission.
  }, [permissions.health, isNative, trySync]);

  // ── Needs permission ─────────────────────────────────────────────────────
  if (
    state === "needs-permission" ||
    (permissions.health === "prompt" &&
      state === "idle")
  ) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 16px",
          background:
            "rgba(229,184,105,0.06)",
          border:
            "1px solid rgba(229,184,105,0.25)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <Heart size={18} color="#E5B869" />

        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#fff",
              margin: "0 0 2px",
            }}
          >
            Health sync needs permission
          </p>

          <p
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            Allow Health access to sync steps,
            sleep and heart-rate.
          </p>
        </div>

        <button
          type="button"
          onClick={async () => {
            await requestPermission("health");

            // The permission state may update asynchronously.
            // Calling trySync here is safe because the in-flight
            // guard prevents duplicate requests.
            trySync();
          }}
          style={{
            padding: "8px 14px",
            background:
              "rgba(229,184,105,0.15)",
            border:
              "1px solid rgba(229,184,105,0.4)",
            borderRadius: "8px",
            color: "#E5B869",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Allow
        </button>
      </div>
    );
  }

  // ── iOS deferred ─────────────────────────────────────────────────────────
  if (state === "ios-deferred") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 16px",
          background:
            "rgba(255,255,255,0.03)",
          border:
            "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-secondary)",
          fontSize: "13px",
        }}
      >
        <Apple size={16} />

        <span>
          Apple Health sync is coming soon.
          Check back in a future update.
        </span>
      </div>
    );
  }

  // ── Unavailable ──────────────────────────────────────────────────────────
  if (state === "unavailable") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 16px",
          background:
            "rgba(255,255,255,0.03)",
          border:
            "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-secondary)",
          fontSize: "13px",
        }}
      >
        <Smartphone size={16} />

        <span>
          Health data sync is available on
          Android. Open the app on your phone
          to sync.
        </span>
      </div>
    );
  }

  // ── Normal states ────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "12px 16px",
        background:
          "rgba(255,255,255,0.03)",
        border:
          "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {state === "done" ? (
          <CheckCircle2
            size={16}
            color="var(--accent-green)"
          />
        ) : state === "error" ? (
          <AlertCircle
            size={16}
            color="#f87171"
          />
        ) : (
          <Activity
            size={16}
            color="var(--accent-gold)"
          />
        )}

        <div>
          <span
            style={{
              fontSize: "13px",
              color: "var(--text-primary)",
              fontWeight: 500,
            }}
          >
            {state === "syncing" &&
              "Reading health data…"}

            {state === "done" && reading && (
              <>
                {reading.steps != null &&
                  `${reading.steps.toLocaleString()} steps`}

                {reading.sleepHours != null &&
                  ` · ${reading.sleepHours} h sleep`}

                {reading.calories != null &&
                  ` · ${reading.calories} kcal`}

                {reading.heartRate != null &&
                  ` · ${reading.heartRate} bpm`}
              </>
            )}

            {state === "idle" &&
              "Tap to sync today's health data"}

            {state === "error" &&
              (errorMsg ||
                "Could not read health data")}
          </span>

          {state === "done" &&
            reading?.lastSynced && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  display: "block",
                }}
              >
                Synced{" "}
                {new Date(
                  reading.lastSynced
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
        </div>
      </div>

      <button
        type="button"
        onClick={trySync}
        disabled={state === "syncing"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 14px",
          background:
            "rgba(255,255,255,0.06)",
          border:
            "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-primary)",
          fontSize: "12px",
          cursor:
            state === "syncing"
              ? "wait"
              : "pointer",
        }}
      >
        <RefreshCw
          size={13}
          style={{
            animation:
              state === "syncing"
                ? "spin 1s linear infinite"
                : "none",
          }}
        />

        {state === "syncing"
          ? "Syncing…"
          : "Sync now"}
      </button>
    </div>
  );
}
