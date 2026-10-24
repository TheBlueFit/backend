"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowDown, ArrowUp, BookOpen, Copy, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { dashboardAPI } from "@/services/api";
import ExercisePicker from "@/components/coach/ExercisePicker";
import { exerciseFromItem, LibraryItem } from "@/lib/exerciseLibrary";

interface Exercise { id: string; order: number; section: string; type: string; name: string; sets: string; reps: string; rest: string; tempo: string; weight: string; rpe: string; notes: string; }
const fieldStyle: React.CSSProperties = { width: "100%", minWidth: 0, boxSizing: "border-box", background: "rgb(var(--well-rgb) / 0.4)", border: "1px solid var(--border-subtle)", borderRadius: 8, color: "var(--text-primary)", padding: "8px 10px", fontSize: 12, outline: "none" };

export default function TemplateClient() {
  const params = useParams<{ id?: string }>();
  const search = useSearchParams();
  const templateId = search.get("id") || params?.id || "";
  const [template, setTemplate] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!templateId) { setMessage({ type: "error", text: "No template selected." }); setIsLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const t = await dashboardAPI.getTemplate(templateId);
        if (cancelled) return;
        setTemplate({ ...t, exercises: (t.exercises || []).map((e: any, i: number) => ({ id: String(e.id || i + 1), order: Number(e.order || i + 1), section: String(e.section || ""), type: String(e.type || ""), name: String(e.name || ""), sets: String(e.sets ?? ""), reps: String(e.reps ?? ""), rest: String(e.rest || ""), tempo: String(e.tempo || ""), weight: String(e.weight || ""), rpe: String(e.rpe ?? ""), notes: String(e.notes || "") })) });
      } catch (err: any) { if (!cancelled) setMessage({ type: "error", text: err.message || "Could not load this template." }); }
      finally { if (!cancelled) setIsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [templateId]);

  const update = (patch: Record<string, any>) => setTemplate((t: any) => ({ ...(t || {}), ...patch }));
  const updateExercise = (index: number, patch: Partial<Exercise>) => setTemplate((t: any) => ({ ...t, exercises: t.exercises.map((e: Exercise, i: number) => i === index ? { ...e, ...patch } : e) }));
  const addExercise = () => setTemplate((t: any) => ({ ...t, exercises: [...t.exercises, { id: String(Date.now()), order: t.exercises.length + 1, section: "", type: "", name: "", sets: "3", reps: "8-12", rest: "", tempo: "", weight: "", rpe: "", notes: "" }] }));
  const removeExercise = (index: number) => setTemplate((t: any) => ({ ...t, exercises: t.exercises.filter((_: any, i: number) => i !== index).map((e: any, i: number) => ({ ...e, order: i + 1 })) }));

  const renumber = (list: any[]) => list.map((e: any, i: number) => ({ ...e, order: i + 1 }));
  const moveExercise = (index: number, to: number) => setTemplate((t: any) => { if (to < 0 || to >= t.exercises.length) return t; const list = [...t.exercises]; const [item] = list.splice(index, 1); list.splice(to, 0, item); return { ...t, exercises: renumber(list) }; });
  const duplicateExercise = (index: number) => setTemplate((t: any) => { const list = [...t.exercises]; list.splice(index + 1, 0, { ...list[index], id: `${Date.now()}-${index}` }); return { ...t, exercises: renumber(list) }; });
  const addFromLibrary = (items: LibraryItem[]) => { const seed = Date.now(); setTemplate((t: any) => ({ ...t, exercises: renumber([...t.exercises, ...items.map((it, i) => exerciseFromItem(it, t.exercises.length + i + 1, seed))]) })); setShowPicker(false); setMessage({ type: "ok", text: `${items.length} exercise(s) added. Reorder them with the arrows, then Save.` }); };

  const save = async () => {
    if (!templateId || !template) return;
    setIsSaving(true); setMessage(null);
    try {
      const saved = await dashboardAPI.updateTemplate(templateId, { title: template.title, description: template.description, goal: template.goal, level: template.level, workoutDays: template.workoutDays, estimatedDuration: template.estimatedDuration, equipment: template.equipment, activities: `${template.exercises.filter((e: Exercise) => e.name.trim()).length} Exercises`, referenceImageKey: template.referenceImageKey, exercises: template.exercises.filter((e: Exercise) => e.name.trim()) });
      setTemplate(saved); setMessage({ type: "ok", text: "Template saved." });
    } catch (err: any) { setMessage({ type: "error", text: err.message || "Could not save this template." }); }
    finally { setIsSaving(false); }
  };

  return <div className="container" style={{ maxWidth: "1000px", paddingBottom: 80 }}>
    {showPicker && <ExercisePicker onAdd={addFromLibrary} onClose={() => setShowPicker(false)} />}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12 }}><Link href="/coach/templates" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", textDecoration: "none", fontSize: 12 }}><ArrowLeft size={18} /> Back to Templates</Link><button onClick={save} disabled={isSaving || isLoading || !templateId} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", fontSize: 12, background: "rgb(var(--green-rgb) / 0.1)", color: "var(--accent-green)", border: "1px solid rgb(var(--green-rgb) / 0.25)" }}><Save size={15} /> {isSaving ? "Saving…" : "Save Changes"}</button></div>
    <div className="app-card fade-in"><h1 className="animated-gradient-text" style={{ fontSize: 24, margin: "0 0 16px" }}>Template Configuration</h1>{message && <div className={message.type === "error" ? "error-banner" : undefined} style={message.type === "ok" ? { color: "var(--accent-green)", marginBottom: 14, fontSize: 13 } : undefined}>{message.text}</div>}
      {isLoading ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading Configuration...</div> : !template ? null : <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>{[["Title","title"],["Goal","goal"],["Level","level"],["Workout days","workoutDays"],["Duration","estimatedDuration"],["Equipment","equipment"]].map(([label,key]) => <label key={key} style={{ display: "flex", flexDirection: "column" }}><span className="label-text" style={{ marginBottom: 6 }}>{label}</span><input value={template[key] || ""} onChange={(e) => update({ [key]: e.target.value })} style={fieldStyle} /></label>)}</div>
        <label style={{ display: "flex", flexDirection: "column" }}><span className="label-text" style={{ marginBottom: 6 }}>Description</span><textarea rows={3} value={template.description || ""} onChange={(e) => update({ description: e.target.value })} style={{ ...fieldStyle, resize: "vertical" }} /></label>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 6 }}><div><div className="label-text">Exercises</div><div style={{ marginTop: 4, color: "var(--text-secondary)", fontSize: 11 }}>{template.exercises.length} exercise(s)</div></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => setShowPicker(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 9, border: "1px solid rgb(var(--gold-rgb) / 0.4)", background: "rgb(var(--gold-rgb) / 0.12)", color: "var(--accent-gold)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}><BookOpen size={14} /> Add from library</button><button type="button" onClick={addExercise} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 9, border: "1px solid rgb(var(--ink-rgb) / 0.1)", background: "rgb(var(--ink-rgb) / 0.04)", color: "var(--text-primary)", cursor: "pointer", fontSize: 11 }}><Plus size={14} /> Blank</button></div></div>
        {template.exercises.map((ex: Exercise, index: number) => <div key={ex.id} style={{ background: "rgb(var(--ink-rgb) / 0.025)", border: "1px solid rgb(var(--ink-rgb) / 0.08)", borderRadius: 12, padding: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}><span style={{ width: 24, height: 24, borderRadius: 8, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, background: "rgb(var(--gold-rgb) / 0.15)", color: "var(--accent-gold)" }}>{index + 1}</span><strong style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name || "Untitled exercise"}</strong>{[[ArrowUp, "Move up", () => moveExercise(index, index - 1), index === 0],[ArrowDown, "Move down", () => moveExercise(index, index + 1), index === template.exercises.length - 1],[Copy, "Duplicate", () => duplicateExercise(index), false]].map(([Icon, label, fn, off]: any) => <button key={label} type="button" aria-label={label} title={label} disabled={off} onClick={fn} style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-primary)", cursor: off ? "default" : "pointer", opacity: off ? 0.3 : 1 }}><Icon size={14} /></button>)}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>{[["Section","section"],["Type","type"],["Exercise","name"],["Sets","sets"],["Reps / Time","reps"],["Rest","rest"],["Tempo","tempo"],["Weight","weight"],["RPE","rpe"],["Notes","notes"]].map(([label,key]) => <label key={key} style={{ display: "flex", flexDirection: "column", gridColumn: key === "notes" ? "1 / -1" : undefined }}><span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: 5 }}>{label}</span><input value={(ex as any)[key] || ""} onChange={(e) => updateExercise(index, { [key]: e.target.value } as any)} style={fieldStyle} /></label>)}</div><button type="button" onClick={() => removeExercise(index)} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 5, background: "transparent", border: 0, color: "var(--danger)", cursor: "pointer", fontSize: 11 }}><Trash2 size={13} /> Remove</button></div>)}
      </div>}
    </div>
  </div>;
}
