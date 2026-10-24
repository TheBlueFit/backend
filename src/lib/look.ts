// Colour palettes + "vibrancy" (how vivid vs. muted the accents are) + motion on/off.
// Pure and self-contained so the same code runs before first paint (see LOOK_INIT_SCRIPT).

export type PaletteId = "classic" | "ocean" | "violet" | "rose" | "ember" | "mint" | "graphite" | "sepia" | "volt";
export type StyleId = "original" | "glass" | "vintage" | "oldgym" | "moderngym";
export type SceneId = "auto" | "night" | "morning" | "afternoon" | "evening" | "off";
export interface Look { palette: PaletteId; vibrancy: number; motion: "on" | "off"; style: StyleId; scene: SceneId }
export type RGB = [number, number, number];

export const LOOK_KEY = "bluefit_look";
export const DEFAULT_LOOK: Look = { palette: "classic", vibrancy: 100, motion: "on", style: "original", scene: "auto" };

/** Surface / typography styles. `palette` is the colour set each one is suggested with (changeable afterwards). */
export const STYLES: { id: StyleId; label: string; blurb: string; palette: PaletteId }[] = [
  { id: "original", label: "Original", blurb: "Your signature dark look", palette: "classic" },
  { id: "glass", label: "Glass", blurb: "Frosted, translucent panels", palette: "classic" },
  { id: "vintage", label: "Vintage", blurb: "Warm paper, serif type", palette: "sepia" },
  { id: "oldgym", label: "Old Gym", blurb: "Concrete, chalk and iron", palette: "ember" },
  { id: "moderngym", label: "Modern Gym", blurb: "Sharp, athletic, high contrast", palette: "volt" },
];

export const SCENES: { id: SceneId; label: string }[] = [
  { id: "auto", label: "Auto (time of day)" }, { id: "night", label: "Night" }, { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" }, { id: "evening", label: "Evening" }, { id: "off", label: "Off" },
];

/** primary replaces the gold role, secondary the green role. Light values are darker so text stays readable. */
export const PALETTES: { id: PaletteId; label: string; dark: [RGB, RGB]; light: [RGB, RGB] }[] = [
  { id: "classic", label: "Classic", dark: [[229, 184, 105], [0, 226, 123]], light: [[168, 115, 15], [10, 143, 85]] },
  { id: "ocean", label: "Ocean", dark: [[56, 189, 248], [45, 212, 191]], light: [[3, 105, 161], [13, 148, 136]] },
  { id: "violet", label: "Violet", dark: [[167, 139, 250], [232, 121, 249]], light: [[109, 40, 217], [162, 28, 175]] },
  { id: "rose", label: "Rose", dark: [[251, 113, 133], [251, 191, 36]], light: [[190, 18, 60], [180, 83, 9]] },
  { id: "ember", label: "Ember", dark: [[251, 146, 60], [250, 204, 21]], light: [[194, 65, 12], [161, 98, 7]] },
  { id: "mint", label: "Mint", dark: [[52, 211, 153], [125, 211, 252]], light: [[4, 120, 87], [3, 105, 161]] },
  { id: "graphite", label: "Graphite", dark: [[212, 212, 220], [148, 163, 184]], light: [[51, 65, 85], [71, 85, 105]] },
  { id: "sepia", label: "Sepia", dark: [[214, 170, 110], [176, 110, 70]], light: [[132, 84, 36], [118, 58, 30]] },
  { id: "volt", label: "Volt", dark: [[190, 242, 100], [34, 211, 238]], light: [[63, 98, 18], [14, 116, 144]] },
];

export const clampVibrancy = (v: number) => Math.max(40, Math.min(100, Math.round(Number.isFinite(v) ? v : 100)));

/**
 * Returns the CSS variables to set on <html> for a look + theme, or null for the untouched original
 * (Classic at full vibrancy). Self-contained on purpose: it is also serialised into the inline init script.
 */
export function computeLookVars(look: Look, theme: "dark" | "light", palettes: typeof PALETTES): Record<string, string> | null {
  const pal = palettes.find((p) => p.id === look.palette) || palettes[0];
  const vib = Math.max(40, Math.min(100, Number(look.vibrancy) || 100));
  if (pal.id === "classic" && vib >= 100) return null;

  const k = (vib - 40) / 60; // 0 = most muted, 1 = full colour
  const dark = theme === "dark";
  const [primary, secondary] = dark ? pal.dark : pal.light;
  const base = dark
    ? { blue: [96, 165, 250], cyan: [77, 216, 255], violet: [155, 140, 255] }
    : { blue: [37, 99, 235], cyan: [3, 105, 161], violet: [109, 40, 217] };

  const soften = (c: number[]): number[] => {
    const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0, s = 0; const l = (mx + mn) / 2;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    s *= 0.35 + 0.65 * k;                       // fade saturation toward grey
    const l2 = dark ? l * (0.82 + 0.18 * k) : l; // on black, vivid colours also glow less
    const cc = (1 - Math.abs(2 * l2 - 1)) * s, x = cc * (1 - Math.abs(((h / 60) % 2) - 1)), m = l2 - cc / 2;
    const sec = Math.floor(h / 60) % 6;
    const t = [[cc, x, 0], [x, cc, 0], [0, cc, x], [0, x, cc], [x, 0, cc], [cc, 0, x]][sec];
    return [Math.round((t[0] + m) * 255), Math.round((t[1] + m) * 255), Math.round((t[2] + m) * 255)];
  };
  const hex = (c: number[]) => "#" + c.map((n) => ("0" + n.toString(16)).slice(-2)).join("");
  const triple = (c: number[]) => `${c[0]} ${c[1]} ${c[2]}`;

  const p = soften(primary), s = soften(secondary), b = soften(base.blue), cy = soften(base.cyan), v = soften(base.violet);
  return {
    "--gold-rgb": triple(p), "--accent-gold": hex(p),
    "--green-rgb": triple(s), "--accent-green": hex(s),
    "--blue-rgb": triple(b), "--blue": hex(b),
    "--cyan-rgb": triple(cy), "--violet-rgb": triple(v),
  };
}

const VAR_NAMES = ["--gold-rgb", "--accent-gold", "--green-rgb", "--accent-green", "--blue-rgb", "--blue", "--cyan-rgb", "--violet-rgb"];

export function readLook(): Look {
  try {
    const raw = JSON.parse(localStorage.getItem(LOOK_KEY) || "null");
    if (raw && typeof raw === "object") {
      return {
        palette: PALETTES.some((p) => p.id === raw.palette) ? raw.palette : "classic",
        vibrancy: clampVibrancy(raw.vibrancy ?? 100),
        motion: raw.motion === "off" ? "off" : "on",
        style: STYLES.some((x) => x.id === raw.style) ? raw.style : "original",
        scene: SCENES.some((x) => x.id === raw.scene) ? raw.scene : "auto",
      };
    }
  } catch {}
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return { ...DEFAULT_LOOK, motion: reduce ? "off" : "on" };
}

export function applyLook(look: Look, theme: "dark" | "light") {
  const root = document.documentElement;
  const vars = computeLookVars(look, theme, PALETTES);
  for (const n of VAR_NAMES) root.style.removeProperty(n);
  if (vars) for (const [n, val] of Object.entries(vars)) root.style.setProperty(n, val);
  root.setAttribute("data-palette", look.palette);
  root.setAttribute("data-motion", look.motion);
  root.setAttribute("data-style", look.style);
  root.setAttribute("data-scene-on", look.scene === "off" ? "0" : "1");
}

export function saveLook(look: Look) {
  try { localStorage.setItem(LOOK_KEY, JSON.stringify(look)); } catch {}
}

/** Inline script body (runs before first paint). Needs `t` (the resolved theme) to be defined already. */
export const LOOK_INIT_SCRIPT = `(function(){try{
var P=${JSON.stringify(PALETTES)},K='${LOOK_KEY}',L=null;
try{L=JSON.parse(localStorage.getItem(K)||'null')}catch(e){}
var rm=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var look={palette:(L&&L.palette)||'classic',vibrancy:(L&&L.vibrancy)||100,motion:L?(L.motion==='off'?'off':'on'):(rm?'off':'on'),style:(L&&L.style)||'original',scene:(L&&L.scene)||'auto'};
var th=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
var f=${computeLookVars.toString()};
var v=f(look,th,P),r=document.documentElement;
if(v){for(var n in v){r.style.setProperty(n,v[n])}}
r.setAttribute('data-palette',look.palette);r.setAttribute('data-motion',look.motion);r.setAttribute('data-style',look.style);r.setAttribute('data-scene-on',look.scene==='off'?'0':'1');
}catch(e){}})();`;
