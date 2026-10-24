"use client";

import React from "react";
import { Check, Moon, RotateCcw, Sun, X } from "lucide-react";
import { useTheme } from "@/components/shell/ThemeProvider";
import { clampVibrancy, computeLookVars, PALETTES, SCENES, STYLES } from "@/lib/look";

const rgb = (c: number[]) => `rgb(${c[0]} ${c[1]} ${c[2]})`;

/** Bottom sheet: light/dark, colour palette, vibrancy (muted ↔ vivid) and animations. Changes apply live. */
export default function AppearanceSheet({ onClose }: { onClose: () => void }) {
  const { theme, setTheme, look, setLook, resetLook } = useTheme();

  const swatch = (id: (typeof PALETTES)[number]["id"]) => {
    const pal = PALETTES.find((p) => p.id === id)!;
    const vars = computeLookVars({ ...look, palette: id }, theme, PALETTES);
    if (vars) return [`rgb(${vars["--gold-rgb"]})`, `rgb(${vars["--green-rgb"]})`];
    const [a, b] = theme === "dark" ? pal.dark : pal.light;
    return [rgb(a), rgb(b)];
  };

  const label: React.CSSProperties = { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", marginBottom: 10, display: "block" };
  const seg = (on: boolean): React.CSSProperties => ({ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 12px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid var(--border-subtle)", background: on ? "var(--text-primary)" : "transparent", color: on ? "var(--bg-app)" : "var(--text-primary)" });

  return (
    <div role="dialog" aria-modal="true" aria-label="Appearance" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgb(0 0 0 / 0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} className="bf-sheet"
        style={{ width: "100%", maxWidth: 520, maxHeight: "90dvh", overflowY: "auto", background: "var(--bg-elev, var(--bg-app))", border: "1px solid var(--border-subtle)", borderRadius: "22px 22px 0 0", padding: "18px 20px calc(22px + env(safe-area-inset-bottom))", boxShadow: "0 -12px 48px rgb(0 0 0 / 0.45)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <strong style={{ fontSize: 17 }}>Appearance</strong>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "transparent", border: 0, color: "var(--text-secondary)", cursor: "pointer", padding: 6 }}><X size={20} /></button>
        </div>

        {/* Live preview: uses the real tokens, so it always matches the app */}
        <div style={{ padding: 16, borderRadius: 16, marginBottom: 20, border: "1px solid rgb(var(--gold-rgb) / 0.25)", background: "linear-gradient(135deg, rgb(var(--gold-rgb) / 0.10), rgb(var(--green-rgb) / 0.08))" }}>
          <div className="animated-gradient-text" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>Welcome back</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ padding: "5px 11px", borderRadius: 999, fontSize: 11, color: "var(--accent-gold)", background: "rgb(var(--gold-rgb) / 0.14)", border: "1px solid rgb(var(--gold-rgb) / 0.35)" }}>Primary</span>
            <span style={{ padding: "5px 11px", borderRadius: 999, fontSize: 11, color: "var(--accent-green)", background: "rgb(var(--green-rgb) / 0.14)", border: "1px solid rgb(var(--green-rgb) / 0.35)" }}>Secondary</span>
            <span style={{ padding: "5px 11px", borderRadius: 999, fontSize: 11, color: "var(--blue)", background: "rgb(var(--blue-rgb) / 0.14)", border: "1px solid rgb(var(--blue-rgb) / 0.35)" }}>Info</span>
          </div>
        </div>

        <span style={label}>Theme</span>
        <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
          <button type="button" style={seg(theme === "dark")} onClick={() => setTheme("dark")}><Moon size={15} /> Dark</button>
          <button type="button" style={seg(theme === "light")} onClick={() => setTheme("light")}><Sun size={15} /> Light</button>
        </div>

        <span style={label}>Style</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
          {STYLES.map((st) => {
            const on = look.style === st.id;
            return (
              <button key={st.id} type="button" onClick={() => setLook({ style: st.id })} aria-pressed={on}
                style={{ textAlign: "left", padding: "12px 14px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", color: "var(--text-primary)", border: on ? "1.5px solid var(--accent-gold)" : "1px solid var(--border-subtle)", background: on ? "rgb(var(--gold-rgb) / 0.12)" : "transparent", gridColumn: st.id === "moderngym" ? "1 / -1" : undefined }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, fontWeight: 600 }}>{st.label}{on && <Check size={15} color="var(--accent-gold)" />}</span>
                <span style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>{st.blurb}</span>
              </button>
            );
          })}
        </div>

        <span style={label}>Colour</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 10, marginBottom: 22 }}>
          {PALETTES.map((p) => {
            const [a, b] = swatch(p.id);
            const on = look.palette === p.id;
            return (
              <button key={p.id} type="button" onClick={() => setLook({ palette: p.id })} aria-pressed={on} aria-label={`${p.label} colours`}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "transparent", border: 0, cursor: "pointer", color: on ? "var(--text-primary)" : "var(--text-secondary)", fontFamily: "inherit", fontSize: 11 }}>
                <span style={{ position: "relative", width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg, ${a} 0 50%, ${b} 50% 100%)`, outline: on ? "2px solid var(--text-primary)" : "1px solid var(--border-subtle)", outlineOffset: 3, display: "grid", placeItems: "center", transition: "outline-color .2s" }}>
                  {on && <Check size={18} color="#000" strokeWidth={3} />}
                </span>
                {p.label}
              </button>
            );
          })}
        </div>

        <span style={{ ...label, display: "flex", justifyContent: "space-between" }}><span>Vibrancy</span><span style={{ textTransform: "none", letterSpacing: 0 }}>{look.vibrancy >= 100 ? "Full colour" : look.vibrancy <= 55 ? "Very soft" : "Softened"}</span></span>
        <input type="range" min={40} max={100} step={5} value={look.vibrancy} aria-label="Colour vibrancy"
          onChange={(e) => setLook({ vibrancy: clampVibrancy(Number(e.target.value)) })}
          style={{ width: "100%", accentColor: "var(--accent-gold)", marginBottom: 4 }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)", marginBottom: 22 }}><span>Muted</span><span>Vivid</span></div>

        <span style={label}>Background scenery</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
          {SCENES.map((sc) => {
            const on = look.scene === sc.id;
            return (
              <button key={sc.id} type="button" onClick={() => setLook({ scene: sc.id })} aria-pressed={on}
                style={{ padding: "8px 13px", borderRadius: 999, fontSize: 12, cursor: "pointer", fontFamily: "inherit", border: on ? "1px solid rgb(var(--gold-rgb) / 0.6)" : "1px solid var(--border-subtle)", background: on ? "rgb(var(--gold-rgb) / 0.15)" : "transparent", color: on ? "var(--accent-gold)" : "var(--text-primary)" }}>
                {sc.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 22 }}>Auto follows your phone's clock: stars at night, a breeze and birds in the morning, sun and butterflies in the afternoon, fireflies at sunset.</div>

        <button type="button" role="switch" aria-checked={look.motion === "on"} onClick={() => setLook({ motion: look.motion === "on" ? "off" : "on" })}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 14, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-primary)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, marginBottom: 14 }}>
          <span style={{ textAlign: "left" }}>Animations<span style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>Soft transitions and ambient glow</span></span>
          <span style={{ width: 44, height: 26, borderRadius: 999, position: "relative", background: look.motion === "on" ? "var(--accent-gold)" : "rgb(var(--ink-rgb) / 0.18)", transition: "background .2s", flex: "none" }}>
            <span style={{ position: "absolute", top: 3, left: look.motion === "on" ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgb(0 0 0 / 0.4)" }} />
          </span>
        </button>

        <button type="button" onClick={resetLook} className="btn-secondary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", fontSize: 12 }}>
          <RotateCcw size={14} /> Reset to original look
        </button>
      </div>
    </div>
  );
}
