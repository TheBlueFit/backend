"use client";

import React, { ReactNode, useEffect, useState } from "react";

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  description?: string;
  icon?: ReactNode;
  progress?: number;
  progressLabel?: string;
  accent?: string;
  compact?: boolean;
}

export default function MetricCard({
  title,
  value,
  unit = "",
  description,
  icon,
  progress,
  progressLabel,
  accent = "#65BFA0",
  compact = false,
}: MetricCardProps) {
  const numericProgress =
    progress === undefined
      ? null
      : Math.min(100, Math.max(0, Number(progress) || 0));

  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    if (numericProgress === null) return;

    let frame = 0;
    const start = performance.now();
    const duration = 850;

    setAnimatedProgress(0);

    const animate = (time: number) => {
      const elapsed = time - start;
      const progressRatio = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progressRatio, 3);

      setAnimatedProgress(numericProgress * eased);

      if (progressRatio < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [numericProgress]);

  return (
    <div
      className={`metric-card bf-premium-surface ${compact ? "compact" : ""}`}
      style={{
        ["--metric-accent" as string]: accent,
        position: "relative",
        minHeight: compact ? "145px" : "170px",
        padding: compact ? "18px" : "21px",
        borderRadius: "22px",
        border: "1px solid rgba(255,255,255,0.065)",
        background:
          "linear-gradient(145deg, rgba(4,5,6,0.985), rgba(0,0,0,0.99))",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.018), 0 18px 42px rgba(0,0,0,0.25), 0 0 22px rgba(104,199,161,0.018)",
        overflow: "hidden",
      } as React.CSSProperties}
    >
      <div
        className="bf-metric-ambient"
        style={{
          position: "absolute",
          width: "120px",
          height: "120px",
          right: "-55px",
          top: "-55px",
          borderRadius: "50%",
          background: accent,
          opacity: 0.035,
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: compact ? "20px" : "24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          {title}
        </div>

        {icon && (
          <div
            style={{
              width: compact ? "34px" : "36px",
              height: compact ? "34px" : "36px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: accent,
              background: `${accent}0e`,
              border: `1px solid ${accent}18`,
              boxShadow: `0 0 18px ${accent}08`,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "6px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontSize: compact ? "29px" : "33px",
            fontWeight: 700,
            lineHeight: 1,
            color: "var(--text-primary)",
            letterSpacing: "-0.04em",
          }}
        >
          {value}
        </span>

        {unit && (
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {description && (
        <div
          style={{
            marginTop: "10px",
            fontSize: "10px",
            color: "var(--text-secondary)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {description}
        </div>
      )}

      {numericProgress !== null && (
        <div
          style={{
            marginTop: compact ? "18px" : "21px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              height: "4px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${animatedProgress}%`,
                borderRadius: "999px",
                background: accent,
                boxShadow: `0 0 7px ${accent}55`,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "7px",
              fontSize: "9px",
              color: "var(--text-secondary)",
            }}
          >
            <span>{progressLabel || "Progress"}</span>
            <span>{Math.round(animatedProgress)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
