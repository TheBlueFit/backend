"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export type Theme = "dark" | "light";
const STORAGE_KEY = "bluefit_theme";
const META_COLOR: Record<Theme, string> = { dark: "#000000", light: "#F3F4F7" };

/** Runs before first paint (inlined in <head>) so there is never a flash of the wrong theme. */
export const THEME_INIT_SCRIPT = `(function(){var t;try{t=localStorage.getItem('${STORAGE_KEY}')}catch(e){}
if(t!=='light'&&t!=='dark'){t='dark'}
var d=document.documentElement;d.setAttribute('data-theme',t);d.style.colorScheme=t;
var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='light'?'${META_COLOR.light}':'${META_COLOR.dark}');})();`;

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "dark", setTheme: () => {}, toggle: () => {} });
export const useTheme = () => useContext(Ctx);

function apply(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META_COLOR[theme]);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") setThemeState(current);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    apply(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }, []);

  const toggle = useCallback(() => {
    const now = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    setTheme(now === "light" ? "dark" : "light");
  }, [setTheme]);

  return <Ctx.Provider value={{ theme, setTheme, toggle }}>{children}</Ctx.Provider>;
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
