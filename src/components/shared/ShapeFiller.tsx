"use client";
/**
 * ShapeFiller — animated, themed metric illustrations
 * ───────────────────────────────────────────────────
 * Each shape looks like the thing it tracks and is alive:
 *
 *   footsteps – footprints stepping up a trail           (steps / movement)
 *   droplet   – water drop, rolling waves + rising bubbles (hydration)
 *   heart     – beating heart with a live ECG sweep       (heart rate / recovery)
 *   moon      – rocking crescent, twinkling stars, drifting “z”s (sleep)
 *   barbell   – barbell doing a rep, sparks at the top    (workout)
 *   flame     – flickering flame with floating embers     (calories / energy)
 *   people    – two athletes with a radar pulse           (clients)
 *   bolt      – charged lightning bolt                    (consistency / power)
 *
 * The liquid level inside every shape follows `progress` (0-100). These are inline SVG
 * animations (not GIF files) so they stay razor sharp at any size, weigh almost nothing,
 * and track the real value. Keyframes live in globals.css under `.bf-sf-*`; they stop
 * automatically for users who prefer reduced motion.
 */

import React, { useEffect, useId, useRef, useState } from "react";

export type FillerShape =
  | "footsteps"
  | "droplet"
  | "heart"
  | "moon"
  | "barbell"
  | "flame"
  | "people"
  | "bolt";

interface ShapeFillerProps {
  shape: FillerShape;
  progress?: number | null;
  accent?: string;
  size?: number;
  noData?: boolean;
}

// ── Eased count-up of the fill level ──────────────────────────────────────────
function useAnimated(target: number, duration = 1100): number {
  const [val, setVal] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setVal(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return val;
}

// ── Liquid: two sine waves sliding at different speeds inside a clip shape ────
function wavePath(width: number, amp: number, depth: number, phase = 0): string {
  const steps = 16;
  const pts: string[] = [];
  for (let i = 0; i <= steps * 2; i++) {
    const x = (i / steps) * width;
    const y = amp * Math.sin((i / steps) * Math.PI * 2 + phase);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} L ${width * 2},${depth} L 0,${depth} Z`;
}

function Liquid({
  clipId, gradId, vw, vh, pct, accent, amp = 2.2, idle,
}: {
  clipId: string; gradId: string; vw: number; vh: number; pct: number; accent: string; amp?: number; idle?: boolean;
}) {
  const level = vh + amp - (pct / 100) * (vh + amp * 2);
  const depth = vh * 2;
  return (
    <g clipPath={`url(#${clipId})`}>
      <g transform={`translate(0 ${level})`} style={{ ["--bf-w" as string]: `${vw}px` } as React.CSSProperties}>
        <path className="bf-sf-wave-b" d={wavePath(vw, amp * 0.8, depth, 1.6)} fill={accent} opacity={idle ? 0.1 : 0.38} />
        <path className="bf-sf-wave-a" d={wavePath(vw, amp, depth)} fill={`url(#${gradId})`} opacity={idle ? 0.18 : 1} />
      </g>
    </g>
  );
}

function Defs({ gradId, accent }: { gradId: string; accent: string }) {
  return (
    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
      <stop offset="100%" stopColor={accent} stopOpacity="0.6" />
    </linearGradient>
  );
}

type Inner = { accent: string; size: number; pct: number; idle: boolean };

const useIds = (name: string) => {
  const uid = useId().replace(/:/g, "");
  return { clip: `bf-${name}-clip-${uid}`, grad: `bf-${name}-grad-${uid}` };
};

// ── Droplet ───────────────────────────────────────────────────────────────────
function Droplet({ accent, size, pct, idle }: Inner) {
  const { clip, grad } = useIds("drop");
  const path = "M32 4 C32 4 10 28 10 41 a22 22 0 0 0 44 0 C54 28 32 4 32 4 Z";
  return (
    <svg className="bf-sf" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs><clipPath id={clip}><path d={path} /></clipPath><Defs gradId={grad} accent={accent} /></defs>
      <g className={idle ? undefined : "bf-sf-bob"}>
        <path d={path} fill={`${accent}12`} />
        <Liquid clipId={clip} gradId={grad} vw={64} vh={64} pct={pct} accent={accent} idle={idle} />
        {!idle && pct > 8 && (
          <g clipPath={`url(#${clip})`} fill="#fff">
            <circle className="bf-sf-bubble" cx="24" cy="54" r="2" style={{ animationDelay: "0s" }} />
            <circle className="bf-sf-bubble" cx="35" cy="56" r="1.5" style={{ animationDelay: "0.9s" }} />
            <circle className="bf-sf-bubble" cx="42" cy="52" r="2.4" style={{ animationDelay: "1.7s" }} />
            <circle className="bf-sf-bubble" cx="30" cy="58" r="1.2" style={{ animationDelay: "2.3s" }} />
          </g>
        )}
        <path d={path} fill="none" stroke={accent} strokeOpacity={idle ? 0.3 : 0.7} strokeWidth="1.8" />
        <path d="M19 36 C19 31 22 27 25 24" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      {!idle && <ellipse className="bf-sf-ripple" cx="32" cy="63" rx="14" ry="2.2" fill="none" stroke={accent} strokeOpacity="0.5" />}
    </svg>
  );
}

// ── Heart + ECG ───────────────────────────────────────────────────────────────
function Heart({ accent, size, pct, idle }: Inner) {
  const { clip, grad } = useIds("heart");
  const path = "M32 57 C32 57 5 41 5 22 A14 14 0 0 1 32 16 A14 14 0 0 1 59 22 C59 41 32 57 32 57 Z";
  return (
    <svg className="bf-sf" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs><clipPath id={clip}><path d={path} /></clipPath><Defs gradId={grad} accent={accent} /></defs>
      <g className={idle ? undefined : "bf-sf-beat"}>
        <path d={path} fill={`${accent}14`} />
        <Liquid clipId={clip} gradId={grad} vw={64} vh={64} pct={pct} accent={accent} amp={2} idle={idle} />
        <g clipPath={`url(#${clip})`}>
          <path
            className={idle ? undefined : "bf-sf-ecg"}
            d="M0 34 H17 L21 25 L26 44 L31 20 L35 36 L38 34 H64"
            pathLength={100}
            fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            strokeOpacity={idle ? 0.35 : 0.95}
            strokeDasharray={idle ? undefined : "34 66"}
          />
        </g>
        <path d={path} fill="none" stroke={accent} strokeOpacity={idle ? 0.3 : 0.75} strokeWidth="1.8" />
        <path d="M13 22 C13 18 16 15 20 15" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      {!idle && <path className="bf-sf-heart-ring" d={path} fill="none" stroke={accent} strokeWidth="1.2" />}
    </svg>
  );
}

// ── Moon ──────────────────────────────────────────────────────────────────────
function Moon({ accent, size, pct, idle }: Inner) {
  const { clip, grad } = useIds("moon");
  const path = "M27.63 8.06 A22 22 0 1 0 46.12 38.88 A18 18 0 1 1 27.63 8.06 Z";
  const stars: [number, number, number, string][] = [[52, 14, 2.2, "0s"], [58, 30, 1.5, "0.8s"], [46, 6, 1.3, "1.5s"], [56, 46, 1.2, "2.1s"]];
  return (
    <svg className="bf-sf" viewBox="0 0 68 64" width={size} height={size * (64 / 68)} aria-hidden="true">
      <defs><clipPath id={clip}><path d={path} /></clipPath><Defs gradId={grad} accent={accent} /></defs>
      <g className={idle ? undefined : "bf-sf-rock"}>
        <path d={path} fill={`${accent}12`} />
        <Liquid clipId={clip} gradId={grad} vw={68} vh={64} pct={pct} accent={accent} amp={2} idle={idle} />
        <path d={path} fill="none" stroke={accent} strokeOpacity={idle ? 0.3 : 0.75} strokeWidth="1.8" strokeLinejoin="round" />
      </g>
      {stars.map(([x, y, r, delay], i) => (
        <path key={i} className={idle ? undefined : "bf-sf-twinkle"} style={{ animationDelay: delay }} fill={accent} opacity={idle ? 0.35 : 0.9}
          d={`M${x} ${y - r * 2} L${x + r * 0.6} ${y - r * 0.6} L${x + r * 2} ${y} L${x + r * 0.6} ${y + r * 0.6} L${x} ${y + r * 2} L${x - r * 0.6} ${y + r * 0.6} L${x - r * 2} ${y} L${x - r * 0.6} ${y - r * 0.6} Z`} />
      ))}
      {!idle && (
        <g fill={accent} fontFamily="system-ui, sans-serif" fontWeight="700">
          <text className="bf-sf-z" x="40" y="30" fontSize="9" style={{ animationDelay: "0s" }}>z</text>
          <text className="bf-sf-z" x="46" y="24" fontSize="7" style={{ animationDelay: "1.2s" }}>z</text>
          <text className="bf-sf-z" x="52" y="19" fontSize="5.5" style={{ animationDelay: "2.4s" }}>z</text>
        </g>
      )}
    </svg>
  );
}

// ── Barbell doing a rep ───────────────────────────────────────────────────────
function Barbell({ accent, size, pct, idle }: Inner) {
  const { clip, grad } = useIds("bell");
  const plates = "M3 12 h6 v24 h-6 Z M10 8 h6 v32 h-6 Z M17 14 h5 v20 h-5 Z M58 14 h5 v20 h-5 Z M64 8 h6 v32 h-6 Z M71 12 h6 v24 h-6 Z";
  const bar = "M22 22 h36 v4 h-36 Z";
  return (
    <svg className="bf-sf" viewBox="0 0 80 52" width={size * 1.45} height={size * 0.94} aria-hidden="true">
      <defs>
        <clipPath id={clip}><path d={`${plates} ${bar}`} /></clipPath>
        <Defs gradId={grad} accent={accent} />
      </defs>
      <g className={idle ? undefined : "bf-sf-lift"}>
        <path d={`${plates} ${bar}`} fill={`${accent}14`} />
        <Liquid clipId={clip} gradId={grad} vw={80} vh={52} pct={pct} accent={accent} amp={1.6} idle={idle} />
        <path d={`${plates} ${bar}`} fill="none" stroke={accent} strokeOpacity={idle ? 0.3 : 0.8} strokeWidth="1.4" strokeLinejoin="round" />
        <rect x="30" y="22" width="20" height="4" fill="none" stroke="#fff" strokeOpacity={idle ? 0.1 : 0.35} strokeDasharray="1.5 2.5" />
      </g>
      {!idle && (
        <g stroke={accent} strokeWidth="1.6" strokeLinecap="round" fill="none">
          <path className="bf-sf-spark" d="M7 3 L5 0" style={{ animationDelay: "0s" }} />
          <path className="bf-sf-spark" d="M40 2 L40 -1" style={{ animationDelay: "0.05s" }} />
          <path className="bf-sf-spark" d="M73 3 L75 0" style={{ animationDelay: "0.1s" }} />
        </g>
      )}
      <ellipse className={idle ? undefined : "bf-sf-shadow"} cx="40" cy="50" rx="24" ry="1.6" fill={accent} opacity="0.18" />
    </svg>
  );
}

// ── Flame ─────────────────────────────────────────────────────────────────────
function Flame({ accent, size, pct, idle }: Inner) {
  const { clip, grad } = useIds("flame");
  const path = "M32 3 C34 15 51 22 51 41 C51 54 43 62 32 62 C21 62 13 54 13 42 C13 33 19 29 21 22 C24 27 26 29 29 29 C28 19 30 11 32 3 Z";
  return (
    <svg className="bf-sf" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs><clipPath id={clip}><path d={path} /></clipPath><Defs gradId={grad} accent={accent} /></defs>
      <g className={idle ? undefined : "bf-sf-flicker"}>
        <path d={path} fill={`${accent}14`} />
        <Liquid clipId={clip} gradId={grad} vw={64} vh={64} pct={pct} accent={accent} amp={2.4} idle={idle} />
        {!idle && pct > 5 && (
          <path className="bf-sf-inner-flame" clipPath={`url(#${clip})`} fill="#fff" fillOpacity="0.35"
            d="M32 62 C25 62 21 56 21 50 C21 44 26 42 28 36 C32 42 43 45 43 52 C43 58 38 62 32 62 Z" />
        )}
        <path d={path} fill="none" stroke={accent} strokeOpacity={idle ? 0.3 : 0.8} strokeWidth="1.8" strokeLinejoin="round" />
      </g>
      {!idle && (
        <g fill={accent}>
          <circle className="bf-sf-ember" cx="22" cy="20" r="1.5" style={{ animationDelay: "0s" }} />
          <circle className="bf-sf-ember" cx="44" cy="24" r="1.2" style={{ animationDelay: "0.8s" }} />
          <circle className="bf-sf-ember" cx="34" cy="14" r="1" style={{ animationDelay: "1.5s" }} />
        </g>
      )}
    </svg>
  );
}

// ── People (clients) ──────────────────────────────────────────────────────────
function People({ accent, size, pct, idle }: Inner) {
  const { clip, grad } = useIds("ppl");
  const front = "M24 8 a9 9 0 1 0 0.01 0 Z M7 58 C7 44 14 38 24 38 C34 38 41 44 41 58 Z";
  const back = "M46 14 a7.5 7.5 0 1 0 0.01 0 Z M31 58 C31 47 37 42 46 42 C55 42 61 47 61 58 Z";
  return (
    <svg className="bf-sf" viewBox="0 0 68 64" width={size} height={size * (64 / 68)} aria-hidden="true">
      <defs><clipPath id={clip}><path d={`${back} ${front}`} /></clipPath><Defs gradId={grad} accent={accent} /></defs>
      {!idle && (
        <>
          <circle className="bf-sf-radar" cx="34" cy="34" r="22" fill="none" stroke={accent} strokeWidth="1.2" />
          <circle className="bf-sf-radar" cx="34" cy="34" r="22" fill="none" stroke={accent} strokeWidth="1.2" style={{ animationDelay: "1.3s" }} />
        </>
      )}
      <path d={`${back} ${front}`} fill={`${accent}14`} />
      <Liquid clipId={clip} gradId={grad} vw={68} vh={64} pct={pct} accent={accent} amp={2} idle={idle} />
      <path d={back} fill="none" stroke={accent} strokeOpacity={idle ? 0.25 : 0.55} strokeWidth="1.5" />
      <path d={front} fill="none" stroke={accent} strokeOpacity={idle ? 0.3 : 0.85} strokeWidth="1.8" />
    </svg>
  );
}

// ── Bolt ──────────────────────────────────────────────────────────────────────
function Bolt({ accent, size, pct, idle }: Inner) {
  const { clip, grad } = useIds("bolt");
  const path = "M37 2 L11 36 H28 L23 62 L53 24 H35 Z";
  return (
    <svg className="bf-sf" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" style={{ color: accent }}>
      <defs><clipPath id={clip}><path d={path} /></clipPath><Defs gradId={grad} accent={accent} /></defs>
      <g className={idle ? undefined : "bf-sf-zap"}>
        <path d={path} fill={`${accent}14`} />
        <Liquid clipId={clip} gradId={grad} vw={64} vh={64} pct={pct} accent={accent} amp={2} idle={idle} />
        <path d={path} fill="none" stroke={accent} strokeOpacity={idle ? 0.3 : 0.85} strokeWidth="1.8" strokeLinejoin="round" />
      </g>
      {!idle && (
        <g stroke={accent} strokeWidth="1.6" strokeLinecap="round">
          <path className="bf-sf-spark" d="M8 18 L3 15" style={{ animationDelay: "0.2s", animationDuration: "1.8s" }} />
          <path className="bf-sf-spark" d="M58 38 L63 41" style={{ animationDelay: "0.9s", animationDuration: "1.8s" }} />
          <path className="bf-sf-spark" d="M50 8 L54 4" style={{ animationDelay: "1.4s", animationDuration: "1.8s" }} />
        </g>
      )}
    </svg>
  );
}

// ── Footsteps: prints step up a trail, the glow rises with progress ───────────
function Footsteps({ accent, size, pct, idle }: Inner) {
  const { clip, grad } = useIds("feet");
  const sole = "M0 6 C0 1.5 2.5 -4 5 -4 C7.5 -4 10 1.5 10 6 C10 11 7.5 15 5 15 C2.5 15 0 11 0 6 Z";
  // alternating left / right prints climbing the trail (bottom → top)
  const prints: { x: number; y: number; r: number; flip: boolean }[] = [
    { x: 16, y: 56, r: -10, flip: false },
    { x: 38, y: 46, r: 8, flip: true },
    { x: 17, y: 34, r: -10, flip: false },
    { x: 38, y: 23, r: 8, flip: true },
    { x: 18, y: 12, r: -10, flip: false },
  ];
  return (
    <svg className="bf-sf" viewBox="0 0 64 72" width={size} height={size * 1.12} aria-hidden="true">
      <defs>
        <clipPath id={clip}><rect x="0" y="0" width="64" height="72" rx="10" /></clipPath>
        <Defs gradId={grad} accent={accent} />
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="64" height="72" fill={`${accent}0d`} />
        <g transform={`translate(0 ${72 - (pct / 100) * 72})`} style={{ ["--bf-w" as string]: "64px" } as React.CSSProperties}>
          <path className="bf-sf-wave-b" d={wavePath(64, 1.8, 140, 1.2)} fill={accent} opacity={idle ? 0.06 : 0.16} />
          <path className="bf-sf-wave-a" d={wavePath(64, 2.2, 140)} fill={accent} opacity={idle ? 0.08 : 0.26} />
        </g>
      </g>
      {prints.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r}) ${p.flip ? "scale(-1 1) translate(-10 0)" : ""}`}>
          <g className={idle ? undefined : "bf-sf-print"} style={{ animationDelay: `${i * 0.42}s` }} opacity={idle ? 0.28 : undefined}>
            <path d={sole} fill={accent} />
            <ellipse cx="2" cy="-6" rx="1.3" ry="1.7" fill={accent} />
            <ellipse cx="5" cy="-7.4" rx="1.4" ry="1.9" fill={accent} />
            <ellipse cx="8" cy="-6" rx="1.2" ry="1.6" fill={accent} />
          </g>
        </g>
      ))}
      <rect width="64" height="72" rx="10" fill="none" stroke={accent} strokeOpacity={idle ? 0.2 : 0.35} strokeWidth="1.2" />
    </svg>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
export default function ShapeFiller({ shape, progress, accent = "#65BFA0", size = 56, noData }: ShapeFillerProps) {
  const safeProgress = progress != null ? Math.min(100, Math.max(0, Number(progress) || 0)) : 0;
  const idle = !!noData || progress == null;
  const pct = useAnimated(idle ? 0 : safeProgress, 1200);
  const props: Inner = { accent, size, pct, idle };

  return (
    <div
      className={`bf-sf-wrap${idle ? " bf-sf-idle" : ""}`}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      role="img"
      aria-label={`${shape} progress: ${idle ? "no data" : `${Math.round(safeProgress)}%`}`}
    >
      {shape === "footsteps" && <Footsteps {...props} />}
      {shape === "droplet" && <Droplet {...props} />}
      {shape === "heart" && <Heart {...props} />}
      {shape === "moon" && <Moon {...props} />}
      {shape === "barbell" && <Barbell {...props} />}
      {shape === "flame" && <Flame {...props} />}
      {shape === "people" && <People {...props} />}
      {shape === "bolt" && <Bolt {...props} />}
    </div>
  );
}
