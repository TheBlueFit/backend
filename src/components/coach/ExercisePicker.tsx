"use client";

import React, { useMemo, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { CATEGORIES, CategoryId, LibraryItem, LIBRARY } from "@/lib/exerciseLibrary";

interface Props { onAdd: (items: LibraryItem[]) => void; onClose: () => void }

/** Bottom-sheet library: choose a category, tap variations to select (in order), then add them all at once. */
export default function ExercisePicker({ onAdd, onClose }: Props) {
  const [cat, setCat] = useState<CategoryId>("STRENGTH");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<LibraryItem[]>([]);

  const category = CATEGORIES.find((c) => c.id === cat)!;
  const query = q.trim().toLowerCase();
  const results = useMemo(() => (query ? LIBRARY.filter((i) => `${i.name} ${i.movement} ${i.group}`.toLowerCase().includes(query)) : []), [query]);
  const isPicked = (i: LibraryItem) => picked.some((p) => p.key === i.key);
  const toggle = (i: LibraryItem) => setPicked((p) => (p.some((x) => x.key === i.key) ? p.filter((x) => x.key !== i.key) : [...p, i]));

  const chip = (i: LibraryItem) => {
    const on = isPicked(i);
    return (
      <button key={i.key} type="button" onClick={() => toggle(i)} aria-pressed={on}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999, fontSize: 12, cursor: "pointer", fontFamily: "inherit", border: on ? "1px solid rgb(var(--gold-rgb) / 0.6)" : "1px solid var(--border-subtle)", background: on ? "rgb(var(--gold-rgb) / 0.15)" : "rgb(var(--ink-rgb) / 0.03)", color: on ? "var(--accent-gold)" : "var(--text-primary)" }}>
        {on ? <Check size={13} /> : <Plus size={13} />} {i.name}
      </button>
    );
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Exercise library" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgb(0 0 0 / 0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 720, maxHeight: "88dvh", display: "flex", flexDirection: "column", background: "var(--bg-elev, var(--bg-app))", border: "1px solid var(--border-subtle)", borderRadius: "20px 20px 0 0", boxShadow: "0 -10px 40px rgb(0 0 0 / 0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 8px", flex: "0 0 auto" }}>
          <div><div className="label-text">Exercise library</div><div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>Tap variations to select, then add them in that order.</div></div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "transparent", border: 0, color: "var(--text-secondary)", cursor: "pointer", padding: 6 }}><X size={20} /></button>
        </div>

        <div style={{ padding: "0 18px 10px", position: "relative", flex: "0 0 auto" }}>
          <Search size={15} style={{ position: "absolute", left: 30, top: 12, color: "var(--text-secondary)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all exercises…"
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 38px", fontSize: 16, borderRadius: 10, border: "1px solid var(--border-subtle)", background: "rgb(var(--well-rgb) / 0.4)", color: "var(--text-primary)", outline: "none" }} />
        </div>

        {!query && (
          <div style={{ display: "flex", gap: 8, padding: "0 18px 10px", overflowX: "auto", flex: "0 0 auto" }}>
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" onClick={() => setCat(c.id)}
                style={{ flex: "0 0 auto", padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid var(--border-subtle)", background: cat === c.id ? "var(--text-primary)" : "transparent", color: cat === c.id ? "var(--bg-app)" : "var(--text-primary)" }}>
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ padding: "0 18px 14px", overflowY: "auto", flex: 1 }}>
          {query ? (
            results.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{results.map(chip)}</div> : <div style={{ color: "var(--text-secondary)", fontSize: 13, padding: "16px 0" }}>No exercise matches “{q}”.</div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 12px" }}>{category.blurb}</p>
              {category.movements.map((m) => (
                <div key={m.name} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                    <strong style={{ fontSize: 13 }}>{m.name}</strong>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>{m.group}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{LIBRARY.filter((i) => i.category === cat && i.movement === m.name).map(chip)}</div>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 18px calc(12px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--border-subtle)", flex: "0 0 auto" }}>
          <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)" }}>{picked.length ? `${picked.length} selected` : "Nothing selected"}</span>
          {picked.length > 0 && <button type="button" onClick={() => setPicked([])} className="btn-secondary" style={{ padding: "10px 14px", fontSize: 12, flex: "none" }}>Clear</button>}
          <button type="button" disabled={!picked.length} onClick={() => onAdd(picked)} className="btn-primary" style={{ padding: "10px 18px", fontSize: 12, flex: "none", opacity: picked.length ? 1 : 0.5 }}>
            Add {picked.length || ""} to template
          </button>
        </div>
      </div>
    </div>
  );
}
