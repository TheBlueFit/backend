"use client";
/**
 * MobilePermissionsGate
 * ──────────────────────
 * On mobile (Capacitor/native), detects the device platform and requests
 * every permission the app needs BEFORE any feature that depends on it runs.
 *
 * Permissions requested:
 *   CAMERA          – workout image capture, food photos
 *   PHOTOS / MEDIA  – gallery access (read) for uploading images
 *   HEALTH          – Apple Health / Google Health Connect for step/sleep/HR sync
 *   NOTIFICATIONS   – push notifications for schedule reminders
 *   MICROPHONE      – (optional) voice coaching notes
 *
 * On web/desktop the gate is a no-op: it renders children immediately.
 *
 * Sequence:
 *   1. Detect platform (Capacitor → native; else web)
 *   2. Show a friendly "We need a few permissions" screen with plain-English
 *      explanations of WHY each permission is needed.
 *   3. User taps "Allow Permissions" → system dialogs fire one by one.
 *   4. Results are stored in localStorage so we never ask twice in the same
 *      install.  Denied permissions are still shown with a soft warning and
 *      a "Go to Settings" deep-link button.
 *   5. Children render regardless; individual features gracefully degrade
 *      when a permission is denied.
 *
 * Usage (wrap _app or layout):
 *   <MobilePermissionsGate>
 *     {children}
 *   </MobilePermissionsGate>
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Camera, Heart, Bell, Image as ImageIcon,
  CheckCircle2, XCircle, AlertCircle, Settings, ArrowRight, Loader2, Mic,
} from "lucide-react";

// ── Public context so child components can query permission states ──────────────
interface PermissionStates {
  camera: "granted" | "denied" | "prompt" | "unavailable" | "unknown";
  photos: "granted" | "denied" | "prompt" | "unavailable" | "unknown";
  health: "granted" | "denied" | "prompt" | "unavailable" | "unknown";
  notifications: "granted" | "denied" | "prompt" | "unavailable" | "unknown";
  microphone: "granted" | "denied" | "prompt" | "unavailable" | "unknown";
}

interface PermissionsCtx {
  permissions: PermissionStates;
  requestPermission: (name: keyof PermissionStates) => Promise<void>;
  isNative: boolean;
}

const defaultPermissions: PermissionStates = {
  camera: "unknown", photos: "unknown", health: "unknown",
  notifications: "unknown", microphone: "unknown",
};

const PermissionsContext = createContext<PermissionsCtx>({
  permissions: defaultPermissions,
  requestPermission: async () => {},
  isNative: false,
});

export const usePermissions = () => useContext(PermissionsContext);

// ── Permission meta ────────────────────────────────────────────────────────────
const PERMISSION_META: Array<{
  key: keyof PermissionStates;
  Icon: React.ElementType;
  title: string;
  reason: string;
  optional?: boolean;
}> = [
  {
    key: "camera",
    Icon: Camera,
    title: "Camera",
    reason: "Take photos of workouts and meals directly from the app.",
  },
  {
    key: "photos",
    Icon: ImageIcon,
    title: "Photo Library",
    reason: "Upload existing workout images and food photos from your gallery.",
  },
  {
    key: "health",
    Icon: Heart,
    title: "Health Data",
    reason: "Sync steps, sleep and heart-rate from Apple Health or Google Health Connect for accurate progress tracking.",
  },
  {
    key: "notifications",
    Icon: Bell,
    title: "Notifications",
    reason: "Receive workout reminders, check-in prompts and coach messages.",
  },
  {
    key: "microphone",
    Icon: Mic,
    title: "Microphone",
    reason: "Record voice notes for your coach (optional).",
    optional: true,
  },
];

// ── Capacitor helpers (dynamically imported so web build never fails) ──────────
async function detectNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function requestCameraPermission(): Promise<"granted" | "denied"> {
  try {
    const { Camera: Cap } = await import("@capacitor/camera");
    const result = await Cap.requestPermissions({ permissions: ["camera", "photos"] });
    const cam = (result as any).camera ?? result;
    return cam === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

async function requestPhotosPermission(): Promise<"granted" | "denied"> {
  try {
    const { Camera: Cap } = await import("@capacitor/camera");
    const result = await Cap.requestPermissions({ permissions: ["photos"] });
    const photos = (result as any).photos ?? result;
    return photos === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

// ── Platform detection helper ──────────────────────────────────────────────────
async function getPlatform(): Promise<"android" | "ios" | "web"> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    const p = Capacitor.getPlatform();
    if (p === "android") return "android";
    if (p === "ios") return "ios";
  } catch {}
  return "web";
}

// ── Android ACTIVITY_RECOGNITION (required by Health Connect on Android 10+) ───
async function requestAndroidActivityRecognition(): Promise<boolean> {
  try {
    // Capacitor's Permissions plugin exposes Android manifest permissions.
    // ACTIVITY_RECOGNITION is the gateway Android 10+ enforces before any
    // Google Fit / Health Connect read is allowed.
    const { Permissions } = await import("@capacitor/core") as any;
    if (!Permissions) return true; // plugin not present — continue anyway
    const status = await Permissions.query({ name: "android.permission.ACTIVITY_RECOGNITION" }).catch(() => null);
    if (status?.state === "granted") return true;
    const result = await Permissions.request({ name: "android.permission.ACTIVITY_RECOGNITION" }).catch(() => null);
    return result?.state === "granted";
  } catch {
    return true; // If the plugin isn't wired, don't block the Health flow
  }
}

async function requestHealthPermission(): Promise<"granted" | "denied"> {
  try {
    const platform = await getPlatform();

    // ── Android: request ACTIVITY_RECOGNITION first ────────────────────────
    // Without this, Health Connect returns an error on Android 10+ even if
    // the user has already approved it in the Health Connect app.
    if (platform === "android") {
      const activityGranted = await requestAndroidActivityRecognition();
      if (!activityGranted) return "denied";
    }

    // ── iOS: deferred — do not request Apple Health permission yet ─────────
    // Per project spec, iOS Health sync is out of scope for this release.
    if (platform === "ios") {
      return "unavailable" as any; // treated as "unavailable" by the gate UI
    }

    // ── Android / any native: proceed with Health Connect via the plugin ───
    const { Health } = await import("@capgo/capacitor-health");
    const avail = await Health.isAvailable().catch(() => ({ available: false }));
    if (!(avail as any).available) return "denied";

    await Health.requestAuthorization({
      read: ["steps", "sleep", "calories", "heartRate"],
      write: [],
    });
    return "granted"; // requestAuthorization resolves if user approved; throws on explicit deny
  } catch {
    return "denied";
  }
}

async function requestNotificationsPermission(): Promise<"granted" | "denied"> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const result = await PushNotifications.requestPermissions();
    return (result as any).receive === "granted" ? "granted" : "denied";
  } catch {
    // Fallback: web Notification API
    if (typeof Notification !== "undefined") {
      const r = await Notification.requestPermission();
      return r === "granted" ? "granted" : "denied";
    }
    return "denied";
  }
}

async function requestMicrophonePermission(): Promise<"granted" | "denied"> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

async function openNativeSettings(): Promise<void> {
  try {
    const { NativeSettings, AndroidSettings, IOSSettings } = await import("capacitor-native-settings");
    await NativeSettings.open({ optionAndroid: AndroidSettings.ApplicationDetails, optionIOS: IOSSettings.App });
  } catch {
    // Fallback for web
    console.warn("Native settings not available on this platform.");
  }
}

const STORAGE_KEY = "bluefit_permissions_v1";
const GATE_DONE_KEY = "bluefit_gate_done_v1";

function isGateDone(): boolean {
  try { return localStorage.getItem(GATE_DONE_KEY) === "1"; } catch { return false; }
}
function markGateDone() {
  try { localStorage.setItem(GATE_DONE_KEY, "1"); } catch {}
}

function loadStoredPermissions(): Partial<PermissionStates> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePermissions(p: PermissionStates) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: PermissionStates[keyof PermissionStates] }) {
  if (status === "granted") return <CheckCircle2 size={18} color="#00E27B" />;
  if (status === "denied") return <XCircle size={18} color="#FF453A" />;
  if (status === "unavailable") return <AlertCircle size={18} color="rgba(255,255,255,0.3)" />;
  return <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)" }} />;
}

// ── Gate component ─────────────────────────────────────────────────────────────
interface GateProps { children: React.ReactNode; }

export default function MobilePermissionsGate({ children }: GateProps) {
  const [isNative, setIsNative] = useState(false);
  const [gateDone, setGateDone] = useState(false);        // whether we've gone through the gate
  const [showGate, setShowGate] = useState(false);        // whether to SHOW the gate screen
  const [requesting, setRequesting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [permissions, setPermissions] = useState<PermissionStates>({
    ...defaultPermissions,
    ...loadStoredPermissions(),
  });
  const hasRun = useRef(false);

  // Check if we've already been through the gate
  const alreadyGranted = (p: PermissionStates) =>
    PERMISSION_META.filter(m => !m.optional).every(m => p[m.key] === "granted" || p[m.key] === "unavailable");

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    (async () => {
      const native = await detectNative();
      setIsNative(native);

      if (!native) {
        // On web: silently mark everything unavailable / check Notification API
        const stored = loadStoredPermissions();
        const webPerms: PermissionStates = {
          camera: "unavailable",
          photos: "unavailable",
          health: "unavailable",
          microphone: stored.microphone ?? "unknown",
          notifications: stored.notifications ?? "unknown",
          ...stored,
        };

        // Check Notification permission state (web)
        if (typeof Notification !== "undefined") {
          webPerms.notifications =
            Notification.permission === "granted" ? "granted"
            : Notification.permission === "denied" ? "denied"
            : "prompt";
        }

        setPermissions(webPerms);
        setGateDone(true);
        return;
      }

      // Native: load stored and decide whether to show gate
      const stored = loadStoredPermissions();
      const merged: PermissionStates = { ...defaultPermissions, ...stored };
      setPermissions(merged);

      // Fix 1: If user has already been through the gate once, never show it again
      if (isGateDone() || alreadyGranted(merged)) {
        setGateDone(true);
      } else {
        setShowGate(true);
      }
    })();
  }, []);

  const requestSingle = useCallback(async (key: keyof PermissionStates): Promise<"granted" | "denied"> => {
    switch (key) {
      case "camera":        return requestCameraPermission();
      case "photos":        return requestPhotosPermission();
      case "health":        return requestHealthPermission();
      case "notifications": return requestNotificationsPermission();
      case "microphone":    return requestMicrophonePermission();
      default:              return "denied";
    }
  }, []);

  const requestAll = useCallback(async () => {
    setRequesting(true);
    const updated = { ...permissions };

    for (const meta of PERMISSION_META) {
      if (updated[meta.key] === "granted") continue; // already granted
      setCurrentStep(meta.title);
      try {
        const result = await requestSingle(meta.key);
        updated[meta.key] = result;
        setPermissions({ ...updated });
      } catch {
        updated[meta.key] = "denied";
        setPermissions({ ...updated });
      }
      // Small delay so the user sees each permission being processed
      await new Promise(r => setTimeout(r, 300));
    }

    setCurrentStep("");
    savePermissions(updated);
    setRequesting(false);
    setGateDone(true);
    setShowGate(false);
    markGateDone();
  }, [permissions, requestSingle]);

  const requestPermission = useCallback(async (key: keyof PermissionStates) => {
    const result = await requestSingle(key);
    setPermissions(prev => {
      const next = { ...prev, [key]: result };
      savePermissions(next);
      return next;
    });
  }, [requestSingle]);

  const ctx: PermissionsCtx = { permissions, requestPermission, isNative };

  // ── Render gate screen ───────────────────────────────────────────────────────
  if (showGate && !gateDone) {
    const anyDenied = PERMISSION_META.some(m => permissions[m.key] === "denied");
    const requiredDone = PERMISSION_META.filter(m => !m.optional).every(
      m => permissions[m.key] === "granted" || permissions[m.key] === "unavailable"
    );

    return (
      <PermissionsContext.Provider value={ctx}>
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(8,8,14,0.99)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px env(safe-area-inset-right, 24px) env(safe-area-inset-bottom, 24px) env(safe-area-inset-left, 24px)",
            zIndex: 9999,
            overflowY: "auto",
          }}
        >
          <div style={{ width: "100%", maxWidth: "440px" }}>

            {/* Logo / headline */}
            <div style={{ textAlign: "center", marginBottom: "36px" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "18px", background: "rgba(229,184,105,0.12)", border: "1px solid rgba(229,184,105,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                <Heart size={30} color="#E5B869" />
              </div>
              <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.3px" }}>
                A few quick permissions
              </h1>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.6" }}>
                The Blue Fit needs access to the following features to give you the best experience. You can change these any time in your device Settings.
              </p>
            </div>

            {/* Permission list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
              {PERMISSION_META.map(meta => {
                const status = permissions[meta.key];
                const isActive = requesting && currentStep === meta.title;
                return (
                  <div
                    key={meta.key}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "16px",
                      padding: "16px 18px",
                      background: isActive ? "rgba(229,184,105,0.07)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isActive ? "rgba(229,184,105,0.35)" : status === "denied" ? "rgba(255,69,58,0.3)" : status === "granted" ? "rgba(0,226,123,0.25)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: "14px",
                      transition: "all 0.25s",
                    }}
                  >
                    <div
                      style={{
                        width: "40px", height: "40px", borderRadius: "10px",
                        background: status === "denied" ? "rgba(255,69,58,0.12)" : status === "granted" ? "rgba(0,226,123,0.1)" : "rgba(229,184,105,0.1)",
                        border: `1px solid ${status === "denied" ? "rgba(255,69,58,0.3)" : status === "granted" ? "rgba(0,226,123,0.25)" : "rgba(229,184,105,0.25)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {isActive
                        ? <Loader2 size={20} color="#E5B869" style={{ animation: "spin 1s linear infinite" }} />
                        : <meta.Icon size={20} color={status === "denied" ? "#FF453A" : status === "granted" ? "#00E27B" : "#E5B869"} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                          {meta.title}
                          {meta.optional && <span style={{ fontSize: "10px", color: "var(--text-secondary)", marginLeft: "6px", fontWeight: 400 }}>optional</span>}
                        </span>
                        {isActive
                          ? <span style={{ fontSize: "11px", color: "#E5B869", fontWeight: 600 }}>Requesting…</span>
                          : <StatusBadge status={status} />}
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                        {meta.reason}
                      </p>
                      {status === "denied" && (
                        <button
                          onClick={openNativeSettings}
                          style={{ marginTop: "8px", fontSize: "11px", color: "#60A5FA", background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <Settings size={11} /> Open Settings to enable
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            {!requesting && !requiredDone && (
              <button
                onClick={requestAll}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "rgba(229,184,105,0.15)",
                  border: "1px solid rgba(229,184,105,0.45)",
                  borderRadius: "14px",
                  color: "#E5B869",
                  fontSize: "15px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                Allow Permissions <ArrowRight size={18} />
              </button>
            )}

            {requesting && (
              <div style={{ textAlign: "center", padding: "12px", marginBottom: "12px" }}>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                  {currentStep ? `Requesting ${currentStep}…` : "Processing…"}
                </p>
              </div>
            )}

            {/* Skip / Continue anyway */}
            <button
              onClick={() => { setGateDone(true); setShowGate(false); savePermissions(permissions); markGateDone(); }}
              disabled={requesting}
              style={{
                width: "100%",
                padding: "14px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "14px",
                color: "var(--text-secondary)",
                fontSize: "13px",
                cursor: requesting ? "not-allowed" : "pointer",
              }}
            >
              {anyDenied ? "Continue with limited access" : "Continue without permissions"}
            </button>

            {anyDenied && (
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", textAlign: "center", margin: "12px 0 0", lineHeight: "1.5" }}>
                Some features will be limited. You can grant permissions at any time from your device Settings.
              </p>
            )}
          </div>
        </div>
      </PermissionsContext.Provider>
    );
  }

  // ── Normal render (gate done or web) ─────────────────────────────────────────
  if (!gateDone) {
    // Brief loading splash while detecting platform
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(8,8,14,0.99)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
        <Loader2 size={32} color="#E5B869" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <PermissionsContext.Provider value={ctx}>
      {children}
    </PermissionsContext.Provider>
  );
}
