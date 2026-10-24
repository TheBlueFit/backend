"use client";

import React, { useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileJson, Loader2, Upload } from "lucide-react";
import { dashboardAPI, ImportResult } from "@/services/api";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const CHUNK = 25; // the server accepts 25 templates per request

const SAMPLE = [
  {
    title: "Push / Pull / Legs — Hypertrophy",
    description: "Six-day split focused on muscle growth.",
    goal: "Muscle gain",
    level: "Intermediate",
    workoutDays: "Mon-Sat",
    estimatedDuration: "60 min",
    equipment: "Barbell, dumbbells, cable machine",
    exercises: [
      { section: "Day 1 — Push", name: "Barbell Bench Press", sets: "4", reps: "6-8", rest: "120s", tempo: "2-0-1-0", weight: "", rpe: "8", notes: "Retract shoulder blades" },
      { section: "Day 1 — Push", name: "Overhead Press", sets: "3", reps: "8-10", rest: "90s", notes: "" },
      { section: "Day 2 — Pull", name: "Pull-Up", sets: "4", reps: "AMRAP", rest: "120s", notes: "Full range of motion" },
    ],
  },
  {
    title: "Fat Loss — 3 Day Full Body",
    goal: "Fat loss",
    level: "Beginner",
    workoutDays: "Mon, Wed, Fri",
    exercises: [
      { name: "Goblet Squat", sets: "3", reps: "12", rest: "60s" },
      { name: "Dumbbell Row", sets: "3", reps: "12", rest: "60s" },
      { name: "Plank", sets: "3", reps: "45 sec", rest: "45s" },
    ],
  },
];

type Parsed = { raw: any; title: string; exercises: number; error?: string; source: string };

const aliasTitle = (o: any) => {
  if (!o || typeof o !== "object") return "";
  const lowered: Record<string, any> = {};
  Object.keys(o).forEach((k) => (lowered[k.trim().toLowerCase()] = o[k]));
  for (const k of ["title", "name", "program", "plan", "template"]) if (lowered[k]) return String(lowered[k]);
  return "";
};
const exerciseRows = (o: any): any[] | null => {
  if (!o || typeof o !== "object") return null;
  const lowered: Record<string, any> = {};
  Object.keys(o).forEach((k) => (lowered[k.trim().toLowerCase()] = o[k]));
  for (const k of ["exercises", "workout", "movements", "items"]) if (Array.isArray(lowered[k])) return lowered[k];
  return null;
};

/** Accepts: one template object, an array of templates, or { templates: [...] }. */
function parseText(text: string, source: string): Parsed[] {
  let json: any;
  try { json = JSON.parse(text.replace(/^﻿/, "")); }
  catch (e: any) { return [{ raw: null, title: source, exercises: 0, error: `Not valid JSON (${e?.message || "parse error"}).`, source }]; }

  const list: any[] = Array.isArray(json) ? json : Array.isArray(json?.templates) ? json.templates : [json];
  return list.map((raw, i) => {
    const rows = exerciseRows(raw);
    const title = aliasTitle(raw) || (list.length === 1 ? source.replace(/\.[a-z]+$/i, "") : `Template ${i + 1}`);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { raw, title, exercises: 0, error: "Not a template object.", source };
    if (!rows) return { raw, title, exercises: 0, error: "No exercise list found (expected an \"exercises\" array).", source };
    const named = rows.filter((r) => r && typeof r === "object" && Object.keys(r).length).length;
    if (!named) return { raw, title, exercises: 0, error: "The exercise list is empty.", source };
    // give an untitled single template a name from the file
    const withTitle = aliasTitle(raw) ? raw : { ...raw, title };
    return { raw: withTitle, title, exercises: rows.length, source };
  });
}

export function downloadSample() {
  const blob = new Blob([JSON.stringify(SAMPLE, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "bluefit-template-sample.json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function WorkoutImageImport({ onSaved, onCancel }: { onSaved: (created: any[]) => void; onCancel: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Parsed[]>([]);
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const addParsed = (parsed: Parsed[]) => {
    setItems((cur) => {
      const next = [...cur, ...parsed];
      setPicked((p) => {
        const out = { ...p };
        parsed.forEach((_, i) => { if (!parsed[i].error) out[cur.length + i] = true; });
        return out;
      });
      return next;
    });
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) { setError(`${file.name} is larger than 2 MB.`); continue; }
      try { addParsed(parseText(await file.text(), file.name)); }
      catch { setError(`Could not read ${file.name}.`); }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const addPasted = () => {
    if (!pasted.trim()) return;
    addParsed(parseText(pasted, "Pasted JSON"));
    setPasted("");
    setError("");
  };

  const valid = useMemo(() => items.map((it, i) => ({ it, i })).filter(({ it, i }) => !it.error && picked[i]), [items, picked]);

  const run = async () => {
    setBusy(true); setError("");
    const created: any[] = [];
    const skipped: ImportResult["skipped"] = [];
    try {
      const payload = valid.map(({ it }) => it.raw);
      for (let start = 0; start < payload.length; start += CHUNK) {
        const res = await dashboardAPI.importTemplates(payload.slice(start, start + CHUNK));
        created.push(...res.created);
        res.skipped.forEach((s) => skipped.push({ ...s, index: s.index + start }));
      }
      setResult({ created, skipped });
      /* parent is told when the coach presses Done */
    } catch (e: any) {
      // anything saved before the failure is kept; tell the user what happened
      if (created.length) setResult({ created, skipped });
      setError(e?.message || "Import failed.");
    } finally { setBusy(false); }
  };

  const note = (tone: "success" | "warn" | "error"): React.CSSProperties =>
    tone === "success"
      ? { background: "rgb(var(--green-rgb) / 0.1)", border: "1px solid rgb(var(--green-rgb) / 0.3)", color: "var(--accent-green)" }
      : tone === "warn"
        ? { background: "rgb(var(--gold-rgb) / 0.1)", border: "1px solid rgb(var(--gold-rgb) / 0.3)", color: "var(--accent-gold)" }
        : { background: "rgb(var(--red-rgb) / 0.1)", border: "1px solid rgb(var(--red-rgb) / 0.3)", color: "var(--danger)" };
  const box = (tone: "success" | "warn" | "error"): React.CSSProperties => ({ padding: 12, borderRadius: "var(--radius-md)", fontSize: 13, ...note(tone) });
  const small: React.CSSProperties = { flex: "none", padding: "11px 16px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" };

  if (result) {
    return (
      <div>
        <div style={box(result.created.length ? "success" : "warn")}>
          {result.created.length
            ? `Imported ${result.created.length} template${result.created.length === 1 ? "" : "s"}.`
            : "Nothing was imported."}
          {result.skipped.length > 0 && ` ${result.skipped.length} skipped.`}
        </div>
        {result.created.some((c: any) => c.warnings?.length) && (
          <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
            {result.created.filter((c: any) => c.warnings?.length).map((c: any, i: number) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)" }}><strong style={{ color: "var(--text-primary)" }}>{c.title}:</strong> {c.warnings.join(" ")}</div>
            ))}
          </div>
        )}
        {result.skipped.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {result.skipped.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12 }}>
                <AlertCircle size={16} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
                <span><strong style={{ fontSize: 13 }}>{s.title}</strong><span style={{ display: "block", color: "var(--text-secondary)" }}>{s.reason}</span></span>
              </div>
            ))}
          </div>
        )}
        {error && <div style={{ ...box("error"), marginTop: 12 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <button type="button" className="btn-primary" style={{ flex: "none", padding: "12px 22px" }} onClick={() => onSaved(result.created)}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 14, color: "var(--text-secondary)" }}>
        Upload one or more <strong style={{ color: "var(--text-primary)" }}>.json</strong> files — each may hold a single template or a list of templates.
        Each template needs a <code>title</code> and an <code>exercises</code> list (name, sets, reps, rest, notes…). Common alternative field names are understood.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <button type="button" className="btn-secondary" style={small} onClick={() => fileRef.current?.click()}><Upload size={15} /> Choose JSON file(s)</button>
        <button type="button" className="btn-secondary" style={small} onClick={downloadSample}><Download size={15} /> Download sample</button>
        <input ref={fileRef} type="file" accept=".json,application/json,text/plain" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </div>

      <details style={{ marginBottom: 14 }}>
        <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--text-secondary)" }}>…or paste JSON</summary>
        <textarea rows={6} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder='[{"title":"My plan","exercises":[{"name":"Squat","sets":"3","reps":"10"}]}]' style={{ width: "100%", marginTop: 8, padding: 12, fontFamily: "ui-monospace, monospace", fontSize: 13, background: "rgb(var(--well-rgb) / 0.4)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", outline: "none" }} />
        <button type="button" className="btn-secondary" style={{ ...small, marginTop: 8 }} onClick={addPasted} disabled={!pasted.trim()}>Add pasted JSON</button>
      </details>

      {error && <div style={{ ...box("error"), marginBottom: 12 }}>{error}</div>}

      {items.length > 0 && (
        <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "4px 12px", maxHeight: 280, overflowY: "auto" }}>
          {items.map((it, i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none", cursor: it.error ? "default" : "pointer" }}>
              <input type="checkbox" disabled={!!it.error} checked={!!picked[i]} onChange={(e) => setPicked((p) => ({ ...p, [i]: e.target.checked }))} style={{ width: 18, height: 18, flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 14, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</strong>
                <span style={{ display: "block", fontSize: 11, color: "var(--text-secondary)" }}>{it.error ? <span style={{ color: "var(--danger)" }}>{it.error}</span> : `${it.exercises} exercise${it.exercises === 1 ? "" : "s"} · ${it.source}`}</span>
              </span>
              {it.error ? <AlertCircle size={17} color="var(--danger)" /> : <CheckCircle2 size={17} color="var(--accent-green)" />}
            </label>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <button type="button" className="btn-secondary" style={small} onClick={() => { setItems([]); setPicked({}); setError(""); }} disabled={!items.length || busy}>Clear</button>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn-secondary" style={small} onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary" style={{ ...small, flex: "none" }} onClick={run} disabled={busy || valid.length === 0}>
            {busy ? <><Loader2 size={15} className="spin" /> Importing…</> : `Import ${valid.length || ""} template${valid.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
