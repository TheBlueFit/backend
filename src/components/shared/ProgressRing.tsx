"use client";

import React, { useEffect, useState } from "react";
import { mix } from "@/lib/format";

interface ProgressRingProps {
  value?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  subLabel?: string;
  suffix?: string;
  duration?: number;
  accent?: string;
  glow?: number;
}

export default function ProgressRing({
  value,
  size = 150,
  strokeWidth = 10,
  label,
  subLabel,
  suffix = "",
  duration = 1000,
  accent = "#65BFA0",
  glow = 2,
}: ProgressRingProps) {
  const hasValue = value !== undefined && value !== null && Number.isFinite(Number(value));
  const safeValue = hasValue
    ? Math.min(100, Math.max(0, Number(value)))
    : 0;

  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    let frame = 0;

    if (!hasValue) {
      setAnimatedValue(0);
      return () => undefined;
    }

    const start = performance.now();

    setAnimatedValue(0);

    const animate = (time: number) => {
      const elapsed = time - start;
      const ratio = duration <= 0 ? 1 : Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);

      setAnimatedValue(safeValue * eased);

      if (ratio < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [safeValue, duration, hasValue]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (animatedValue / 100) * circumference;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        color: accent,
      }}
      aria-label={`${label ?? "Progress"}: ${hasValue ? `${Math.round(safeValue)} percent` : "no data"}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: "rotate(-90deg)",
          overflow: "visible",
        }}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--ink-rgb) / 0.055)"
          strokeWidth={strokeWidth}
        />

        {hasValue && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: "stroke-dashoffset 80ms linear",
              filter:
                glow > 0
                  ? `drop-shadow(0 0 ${glow}px ${mix(accent, "55")})`
                  : "none",
            }}
          />
        )}
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: size > 130 ? "28px" : "21px",
            fontWeight: 700,
            lineHeight: 1,
            color: "var(--text-primary)",
            letterSpacing: "-0.04em",
          }}
        >
          {hasValue ? Math.round(animatedValue) : "—"}
          {hasValue && suffix}
        </div>

        {label && (
          <div
            style={{
              marginTop: "7px",
              fontSize: "9px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
            }}
          >
            {label}
          </div>
        )}

        {subLabel && (
          <div
            style={{
              marginTop: "3px",
              fontSize: "9px",
              color: "var(--text-secondary)",
            }}
          >
            {hasValue ? subLabel : "No data yet"}
          </div>
        )}
      </div>
    </div>
  );
}
