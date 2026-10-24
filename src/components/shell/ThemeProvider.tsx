"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Moon, Palette, Sun } from "lucide-react";
import { applyLook, DEFAULT_LOOK, Look, LOOK_INIT_SCRIPT, readLook, saveLook, STYLES } from "@/lib/look";
import SceneBackground from "@/components/shell/SceneBackground";
import AppearanceSheet from "@/components/shell/AppearanceSheet";

export type Theme = "dark" | "light";
const STORAGE_KEY = "bluefit_theme";
const META_COLOR: Record<Theme, string> = { dark: "#000000", light: "#F3F4F7" };

/** Runs before first paint (inlined in <head>) so there is never a flash of the wrong theme. */
export const THEME_INIT_SCRIPT = `(function(){var t;try{t=localStorage.getItem('${STORAGE_KEY}')}catch(e){}
if(t!=='light'&&t!=='dark'){t='dark'}
var d=document.documentElement;d.setAttribute('data-theme',t);d.style.colorScheme=t;
var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='light'?'${META_COLOR.light}':'${META_COLOR.dark}');})();
${LOOK_INIT_SCRIPT}`;

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  look: Look;
  setLook: (patch: Partial<Look>) => void;
  resetLook: () => void;
  openAppearance: () => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "dark", setTheme: () => {}, toggle: () => {}, look: DEFAULT_LOOK, setLook: () => {}, resetLook: () => {}, openAppearance: () => {} });
export const useTheme = () => useContext(Ctx);

function apply(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META_COLOR[theme]);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [look, setLookState] = useState<Look>(DEFAULT_LOOK);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") setThemeState(current);
    setLookState(readLook());
  }, []);

  const setLook = useCallback((patch: Partial<Look>) => {
    setLookState((prev) => {
      // choosing a style also switches to the colours it is designed with (they can still be changed afterwards)
      const suggested = patch.style && patch.palette === undefined ? STYLES.find((x) => x.id === patch.style)?.palette : undefined;
      const next = { ...prev, ...patch, ...(suggested ? { palette: suggested } : {}) };
      const th = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      applyLook(next, th);
      saveLook(next);
      return next;
    });
  }, []);
  const resetLook = useCallback(() => {
    const th = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const next: Look = { ...DEFAULT_LOOK, motion: reduce ? "off" : "on" };
    setLookState(next); applyLook(next, th); saveLook(next);
  }, []);
  const openAppearance = useCallback(() => setSheetOpen(true), []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    apply(next);
    setLookState((l) => { applyLook(l, next); return l; });
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }, []);

  const toggle = useCallback(() => {
    const now = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    setTheme(now === "light" ? "dark" : "light");
  }, [setTheme]);

  return (
    <Ctx.Provider value={{ theme, setTheme, toggle, look, setLook, resetLook, openAppearance }}>
      <SceneBackground />
      {children}
      {sheetOpen && <AppearanceSheet onClose={() => setSheetOpen(false)} />}
    </Ctx.Provider>
  );
}

/** Light / dark switch. `compact` renders just the icon (phone top bar, login page). */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      className={`theme-toggle${compact ? " icon-only" : ""}`}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
      {!compact && (
        <>
          <span>{theme === "dark" ? "Dark" : "Light"} theme</span>
          <span className="track" aria-hidden="true" />
        </>
      )}
    </button>
  );
}

/** Opens the Appearance sheet (palette, vibrancy, motion). `compact` = icon only. */
export function AppearanceButton({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { openAppearance } = useTheme();
  return (
    <button type="button" onClick={openAppearance} className={`theme-toggle${compact ? " icon-only" : ""} ${className}`} aria-label="Appearance: colours and animation" title="Appearance">
      <Palette size={17} />
      {!compact && <span>Appearance</span>}
    </button>
  );
}
