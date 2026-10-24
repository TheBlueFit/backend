"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Droplets, Footprints, Moon, RefreshCw, Smartphone } from "lucide-react";
import { dashboardAPI, getLocalDateISO } from "@/services/api";
import { timeAgo } from "@/lib/format";
import { usePermissions } from "@/components/shared/MobilePermissionsGate";

export interface DailyValues {
  steps?: number | null;
  sleepHours?: number | null;
  hydration?: number | null;
  calories?: number | null;
  heartRate?: number | null;
}

const numOrUndef = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) ? undefined : Number(v));

/**
 * Daily log. iPhone web apps cannot read Apple Health, so entries are typed in here;
 * on the Android app the same card can pull today's numbers from Health Connect.
 */
export default function DailyLogCard({
  values, source, updatedAt, onSaved,
}: { values: DailyValues; source?: string | null; updatedAt?: string | null; onSaved: (v: DailyValues) => void }) {
  const { isNative } = usePermissions();
  const [steps, setSteps] = useState("");
  const [sleep, setSleep] = useState("");
  const [water, setWater] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // pre-fill with what is already saved for today
  useEffect(() => {
    setSteps(values.steps != null ? String(values.steps) : "");
    setSleep(values.sleepHours != null ? String(values.sleepHours) : "");
    setWater(values.hydration != null ? String(values.hydration) : "");
  }, [values.steps, values.sleepHours, values.hydration]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const payload: DailyValues = { steps: numOrUndef(steps), sleepHours: numOrUndef(sleep), hydration: numOrUndef(water) };
    if (payload.steps == null && payload.sleepHours == null && payload.hydration == null) {
      setMsg({ tone: "error", text: "Enter at least one value to save." });
      return;
    }
    setBusy(true);
    try {
      await dashboardAPI.saveHealthMetrics({ ...payload, date: getLocalDateISO(), source: "manual" } as any);
      onSaved(payload);
      setMsg({ tone: "success", text: "Saved. Your coach can see this now." });
    } catch (err: any) {
      setMsg({ tone: "error", text: err?.message || "Could not save." });
    } finally {
      setBusy(false);
    }
  };

  const syncNative = async () => {
    setSyncing(true); setMsg(null);
    try {
      const { Health } = await import("@capgo/capacitor-health");
      const avail = await Health.isAvailable();
      if (!(avail as any).available) throw new Error("Health data is not available on this device.");
      await Health.requestAuthorization({ read: ["steps", "sleep", "calories", "heartRate"], write: [] });
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const range = { startDate: start.toISOString(), endDate: new Date().toISOString() };
      const sum = async (dataType: any) => {
        const r: any = await (Health as any).readSamples({ ...range, dataType });
        const list: any[] = r?.samples ?? [];
        return list.length ? list.reduce((a, s) => a + (Number(s.value) || 0), 0) : undefined;
      };
      const stepsV = await sum("steps");
      const sleepMin = await (async () => {
        const r: any = await (Health as any).readSamples({ startDate: new Date(Date.now() - 12 * 3600e3).toISOString(), endDate: range.endDate, dataType: "sleep" });
        const list: any[] = r?.samples ?? [];
        return list.length ? list.reduce((a, s) => a + (Number(s.value) || 0), 0) : undefined;
      })();
      const payload: DailyValues = {
        steps: stepsV != null ? Math.round(stepsV) : undefined,
        sleepHours: sleepMin != null ? Math.round((sleepMin / 60) * 10) / 10 : undefined,
      };
      if (payload.steps == null && payload.sleepHours == null) throw new Error("No health data found for today.");
      await dashboardAPI.saveHealthMetrics({ ...payload, date: getLocalDateISO(), source: "health-connect" } as any);
      onSaved(payload);
      setMsg({ tone: "success", text: "Synced from Health Connect." });
    } catch (err: any) {
      setMsg({ tone: "error", text: err?.message || "Could not sync health data." });
    } finally {
      setSyncing(false);
    }
  };

  const field: React.CSSProperties = { width: "100%", padding: "13px 14px", background: "rgb(var(--well-rgb) / 0.4)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", outline: "none", fontSize: 15, marginTop: 8, fontFamily: "inherit" };
  const tone = (t: "success" | "error") => t === "success"
    ? { background: "rgb(var(--green-rgb) / 0.1)", border: "1px solid rgb(var(--green-rgb) / 0.3)", color: "var(--accent-green)" }
    : { background: "rgb(var(--red-rgb) / 0.1)", border: "1px solid rgb(var(--red-rgb) / 0.3)", color: "var(--danger)" };

  return (
    <form onSubmit={save} style={{ padding: "18px 18px 20px", background: "var(--bg-input)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", backdropFilter: "blur(10px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600 }}><CheckCircle2 size={17} color="var(--accent-green)" /> Today&apos;s log</div>
          <div style={{ marginTop: 5, fontSize: 11, color: "var(--text-secondary)" }}>
            {updatedAt ? `Last updated ${timeAgo(updatedAt)}${source ? ` · ${source === "manual" ? "entered by you" : source}` : ""}` : "Log your numbers so your coach can follow your progress."}
          </div>
        </div>
        {isNative && (
          <button type="button" className="btn-secondary" style={{ flex: "none", padding: "9px 14px", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }} onClick={syncNative} disabled={syncing}>
            {syncing ? <RefreshCw size={13} className="spin" /> : <Smartphone size={13} />} Sync
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
        <div className="input-group">
          <label className="label-text" htmlFor="log-steps"><Footprints size={12} style={{ verticalAlign: "-2px" }} /> Steps</label>
          <input id="log-steps" inputMode="numeric" type="number" min={0} max={200000} step={1} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="e.g. 8500" style={field} />
        </div>
        <div className="input-group">
          <label className="label-text" htmlFor="log-sleep"><Moon size={12} style={{ verticalAlign: "-2px" }} /> Sleep (hours)</label>
          <input id="log-sleep" inputMode="decimal" type="number" min={0} max={24} step={0.1} value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="e.g. 7.5" style={field} />
        </div>
        <div className="input-group">
          <label className="label-text" htmlFor="log-water"><Droplets size={12} style={{ verticalAlign: "-2px" }} /> Water (litres)</label>
          <input id="log-water" inputMode="decimal" type="number" min={0} max={20} step={0.1} value={water} onChange={(e) => setWater(e.target.value)} placeholder="e.g. 2.5" style={field} />
        </div>
      </div>

      {msg && <div style={{ marginTop: 14, padding: 12, borderRadius: "var(--radius-md)", fontSize: 13, ...tone(msg.tone) }}>{msg.text}</div>}
      <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: 16, width: "100%", padding: 14 }}>{busy ? "Saving…" : "Save today's log"}</button>
    </form>
  );
}
