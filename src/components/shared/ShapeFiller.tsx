"use client";
/**
 * ShapeFiller
 * ────────────
 * Animated SVG "liquid fill" progress indicators shaped like the metric they represent.
 *
 * Shapes:
 *   droplet  – Steps / Hydration : water drop filling from bottom
 *   heart    – Heart Rate / Recovery : heart outline filling with color
 *   moon     – Sleep : crescent moon filling
 *   barbell  – Workout : barbell with plates filling
 *
 * Props:
 *   shape     – which shape to render
 *   progress  – 0-100 fill level (animated)
 *   accent    – fill color
 *   size      – bounding box px (default 56)
 *   noData    – show placeholder animation instead of fill
 */

import React, { useEffect, useId, useRef, useState } from "react";

export type FillerShape = "footsteps" | "droplet" | "heart" | "moon" | "barbell";

interface ShapeFillerProps {
  shape: FillerShape;
  progress?: number | null;
  accent?: string;
  size?: number;
  noData?: boolean;
}

// ── Eased animation hook ──────────────────────────────────────────────────────
function useAnimated(target: number, duration = 1000): number {
  const [val, setVal] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return val;
}

// ── Shared wave clipPath rect approach ────────────────────────────────────────
// We define the shape as a clipPath, then fill a rising rect inside it.
// A subtle sine-wave distorts the fill top for a liquid feel.

function WaveFill({
  id,
  fillPct,
  accent,
  height,
  width,
  noData,
}: {
  id: string;
  fillPct: number;          // 0-100
  accent: string;
  height: number;
  width: number;
  noData?: boolean;
}) {
  // Wave path across the top of the fill rect
  const waveH = 4;
  const y = height - (fillPct / 100) * height;

  // Build a wave path: start left, sine across top, down right, back left
  const segments = 3;
  const points: string[] = [];
  for (let i = 0; i <= segments * 2; i++) {
    const x = (i / (segments * 2)) * width;
    const dy = Math.sin((i / segments) * Math.PI) * waveH * (noData ? 0.3 : 1);
    points.push(`${x},${y + dy}`);
  }

  const wavePath = `M 0,${height} L 0,${y} Q ${points.join(" ")} L ${width},${height} Z`;

  return (
    <path
      d={wavePath}
      fill={noData ? `${accent}30` : accent}
      style={{ transition: "d 200ms ease-out, fill 300ms" }}
      filter={noData ? undefined : `drop-shadow(0 0 4px ${accent}88)`}
    />
  );
}

// ── DROPLET ───────────────────────────────────────────────────────────────────
function DropletFiller({ fillPct, accent, size, noData }: { fillPct: number; accent: string; size: number; noData?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = `droplet-clip-${uid}`;
  // Droplet SVG path (teardrop pointing down) within a 0 0 40 50 viewBox
  const vw = 40; const vh = 50;
  const dropPath = "M20 2 C20 2 4 18 4 30 a16 16 0 0 0 32 0 C36 18 20 2 20 2 Z";

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} width={size} height={size} overflow="visible" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <path d={dropPath} />
        </clipPath>
      </defs>
      {/* Outline */}
      <path d={dropPath} fill="none" stroke={`${accent}33`} strokeWidth="2" />
      {/* Fill */}
      <g clipPath={`url(#${id})`}>
        <WaveFill id={id} fillPct={fillPct} accent={accent} height={vh} width={vw} noData={noData} />
      </g>
      {/* Shine */}
      {!noData && fillPct > 10 && (
        <ellipse cx={14} cy={20} rx={3} ry={5} fill="rgba(255,255,255,0.18)" transform="rotate(-20,14,20)" />
      )}
    </svg>
  );
}

// ── HEART ─────────────────────────────────────────────────────────────────────
function HeartFiller({ fillPct, accent, size, noData }: { fillPct: number; accent: string; size: number; noData?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = `heart-clip-${uid}`;
  const vw = 44; const vh = 42;
  // Standard heart path in 44x42 viewBox
  const heartPath = "M22 38 C22 38 4 26 4 15 a9 9 0 0 1 18 -4 a9 9 0 0 1 18 4 C40 26 22 38 22 38 Z";

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} width={size} height={size} overflow="visible" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <path d={heartPath} />
        </clipPath>
      </defs>
      <path d={heartPath} fill="none" stroke={`${accent}33`} strokeWidth="2" />
      <g clipPath={`url(#${id})`}>
        <WaveFill id={id} fillPct={fillPct} accent={accent} height={vh} width={vw} noData={noData} />
      </g>
      {!noData && fillPct > 15 && (
        <ellipse cx={16} cy={22} rx={2.5} ry={4} fill="rgba(255,255,255,0.15)" transform="rotate(-15,16,22)" />
      )}
    </svg>
  );
}

// ── MOON ─────────────────────────────────────────────────────────────────────
function MoonFiller({ fillPct, accent, size, noData }: { fillPct: number; accent: string; size: number; noData?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = `moon-clip-${uid}`;
  const vw = 44; const vh = 48;
  // Crescent moon: full circle minus an offset circle
  const moonPath = "M22 4 a19 19 0 1 0 0 38 a13 13 0 1 1 0 -38 Z";

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} width={size} height={size} overflow="visible" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <path d={moonPath} />
        </clipPath>
      </defs>
      <path d={moonPath} fill="none" stroke={`${accent}33`} strokeWidth="2" />
      <g clipPath={`url(#${id})`}>
        <WaveFill id={id} fillPct={fillPct} accent={accent} height={vh} width={vw} noData={noData} />
      </g>
      {/* Stars when no data */}
      {noData && (
        <>
          <circle cx={32} cy={10} r={1.2} fill={`${accent}66`} />
          <circle cx={36} cy={18} r={0.8} fill={`${accent}44`} />
          <circle cx={30} cy={16} r={0.6} fill={`${accent}33`} />
        </>
      )}
    </svg>
  );
}

// ── BARBELL ───────────────────────────────────────────────────────────────────
function BarbellFiller({ fillPct, accent, size, noData }: { fillPct: number; accent: string; size: number; noData?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = `barbell-clip-${uid}`;
  const vw = 56; const vh = 28;
  // Barbell: horizontal bar + two plates on each side
  // Bar: rect at center, plates: rects on each end
  const barbellPath = [
    // Left outer plate
    "M2,8 L2,20 L8,20 L8,8 Z",
    // Left inner plate
    "M8,10 L8,18 L13,18 L13,10 Z",
    // Bar
    "M13,12 L43,12 L43,16 L13,16 Z",
    // Right inner plate
    "M43,10 L43,18 L48,18 L48,10 Z",
    // Right outer plate
    "M48,8 L48,20 L54,20 L54,8 Z",
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} width={size * 1.4} height={size * 0.7} overflow="visible" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <path d={barbellPath} />
        </clipPath>
      </defs>
      {/* Outline */}
      <path d={barbellPath} fill="none" stroke={`${accent}33`} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Fill */}
      <g clipPath={`url(#${id})`}>
        <WaveFill id={id} fillPct={fillPct} accent={accent} height={vh} width={vw} noData={noData} />
      </g>
    </svg>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
// ── FOOTSTEPS ─────────────────────────────────────────────────────────────────
// Animated walking footsteps: two feet alternate left/right.
// A rising fill behind them shows progress %.
function FootstepsFiller({ fillPct, accent, size, noData }: { fillPct: number; accent: string; size: number; noData?: boolean }) {
  const footprint = "M7 16 C4 16 2 13 2 10 C2 7 3 5 5 3 C5.5 1.5 6.5 1 7 1 C7.5 1 8.5 1.5 9 3 C11 5 12 7 12 10 C12 13 10 16 7 16 Z";

  const animStyle: React.CSSProperties = noData ? {} : {
    display: "inline-block",
  };

  return (
    <svg viewBox="0 0 64 72" width={size} height={size * 1.12} overflow="visible" aria-hidden="true">
      <defs>
        <clipPath id="steps-fill-clip">
          <rect x="0" y="0" width="64" height="72" />
        </clipPath>
        <style>{`
          @keyframes bf-step-l {
            0%,100% { transform:translateY(0px); }
            50%      { transform:translateY(-8px); }
          }
          @keyframes bf-step-r {
            0%,100% { transform:translateY(-8px); }
            50%      { transform:translateY(0px); }
          }
          .bf-foot-l { animation: ${noData ? "none" : "bf-step-l 0.9s ease-in-out infinite"}; transform-origin: 7px 16px; }
          .bf-foot-r { animation: ${noData ? "none" : "bf-step-r 0.9s ease-in-out infinite"}; transform-origin: 7px 16px; }
        `}</style>
      </defs>

      {/* Rising progress fill */}
      <g clipPath="url(#steps-fill-clip)">
        <rect
          x="0" y={72 - (fillPct / 100) * 60} width="64" height="72"
          fill={noData ? `${accent}18` : `${accent}26`} rx="4"
        />
        {!noData && fillPct > 0 && (
          <line
            x1="0" y1={72 - (fillPct / 100) * 60}
            x2="64" y2={72 - (fillPct / 100) * 60}
            stroke={accent} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.45"
          />
        )}
      </g>

      {/* Left foot */}
      <g transform="translate(8,20)" opacity={noData ? 0.3 : 0.92}>
        <g className="bf-foot-l">
          <path d={footprint} fill={accent} />
          <ellipse cx="5" cy="2.2" rx="1.2" ry="0.7" fill={`${accent}cc`} />
          <ellipse cx="7" cy="1.5" rx="1.2" ry="0.7" fill={`${accent}cc`} />
          <ellipse cx="9" cy="2.2" rx="1.2" ry="0.7" fill={`${accent}cc`} />
        </g>
      </g>

      {/* Right foot (mirrored) */}
      <g transform="translate(40,18) scale(-1,1) translate(-14,0)" opacity={noData ? 0.3 : 0.92}>
        <g className="bf-foot-r">
          <path d={footprint} fill={accent} />
          <ellipse cx="5" cy="2.2" rx="1.2" ry="0.7" fill={`${accent}cc`} />
          <ellipse cx="7" cy="1.5" rx="1.2" ry="0.7" fill={`${accent}cc`} />
          <ellipse cx="9" cy="2.2" rx="1.2" ry="0.7" fill={`${accent}cc`} />
        </g>
      </g>

      {/* Trailing ghost prints */}
      {!noData && fillPct > 20 && (
        <>
          <g transform="translate(5,52)" opacity="0.20">
            <path d={footprint} fill={accent} transform="scale(0.62)" />
          </g>
          <g transform="translate(37,56)" opacity="0.14">
            <path d={footprint} fill={accent} transform="scale(0.52) scale(-1,1) translate(-14,0)" />
          </g>
        </>
      )}
    </svg>
  );
}


export default function ShapeFiller({ shape, progress, accent = "#65BFA0", size = 56, noData }: ShapeFillerProps) {
  const safeProgress = progress != null ? Math.min(100, Math.max(0, Number(progress) || 0)) : 0;
  const fillPct = useAnimated(noData ? 0 : safeProgress, 1100);
  const isNoData = noData || progress == null;

  const props = { fillPct, accent, size, noData: isNoData };

  return (
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      aria-label={`${shape} progress: ${isNoData ? "no data" : `${Math.round(safeProgress)}%`}`}
    >
      {shape === "footsteps" && <FootstepsFiller {...props} />}
      {shape === "droplet"   && <DropletFiller   {...props} />}
      {shape === "heart"   && <HeartFiller   {...props} />}
      {shape === "moon"    && <MoonFiller    {...props} />}
      {shape === "barbell" && <BarbellFiller  {...props} />}
    </div>
  );
}
