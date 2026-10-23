"use client";

import React, { ReactNode, useEffect, useState } from "react";
import ShapeFiller, { FillerShape } from "@/components/shared/ShapeFiller";

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
  /** Which shape filler to use. If omitted, falls back to the classic bar. */
  fillerShape?: FillerShape;
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
  fillerShape,
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
      const ratio = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);
      setAnimatedProgress(numericProgress * eased);
      if (ratio < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [numericProgress]);

  const hasProgress = numericProgress !== null;
  const showFiller = fillerShape !== undefined;

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
        background: "linear-gradient(145deg, rgba(4,5,6,0.985), rgba(0,0,0,0.99))",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.018), 0 18px 42px rgba(0,0,0,0.25), 0 0 22px rgba(104,199,161,0.018)",
        overflow: "hidden",
      } as React.CSSProperties}
    >
      {/* Ambient glow */}
      <div
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

      {/* Header row: title + icon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: compact ? "14px" : "16px",
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

      {/* Value row + shape filler side by side */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 1,
          gap: "10px",
        }}
      >
        {/* Value */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "6px",
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
                marginTop: "8px",
                fontSize: "10px",
                color: "var(--text-secondary)",
              }}
            >
              {description}
            </div>
          )}
        </div>

        {/* Shape filler — right side of the card */}
        {showFiller && (
          <ShapeFiller
            shape={fillerShape!}
            progress={numericProgress}
            accent={accent}
            size={compact ? 44 : 52}
            noData={!hasProgress}
          />
        )}
      </div>

      {/* Progress bar (only shown when no shape filler) */}
      {!showFiller && (hasProgress || progressLabel) && (
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
            {hasProgress ? (
              <div
                style={{
                  height: "100%",
                  width: `${animatedProgress}%`,
                  borderRadius: "999px",
                  background: accent,
                  boxShadow: `0 0 7px ${accent}55`,
                  transition: "width 80ms linear",
                }}
              />
            ) : (
              <div
                style={{
                  height: "100%",
                  width: "100%",
                  borderRadius: "999px",
                  background: `repeating-linear-gradient(90deg, ${accent}22 0px, ${accent}22 6px, transparent 6px, transparent 12px)`,
                }}
              />
            )}
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
            <span style={{ color: hasProgress ? "var(--text-secondary)" : `${accent}88` }}>
              {hasProgress ? `${Math.round(animatedProgress)}%` : "no data"}
            </span>
          </div>
        </div>
      )}

      {/* Refined progress rail under shape filler */}
      {showFiller && (progressLabel || hasProgress) && (
        <div
          style={{
            marginTop: "13px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              height: "3px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.055)",
              overflow: "hidden",
              boxShadow: "inset 0 1px 1px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: hasProgress ? `${animatedProgress}%` : "0%",
                borderRadius: "999px",
                background: `linear-gradient(90deg, ${accent}66, ${accent})`,
                boxShadow: hasProgress ? `0 0 10px ${accent}44` : "none",
                transition: "width 80ms linear",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "6px",
              fontSize: "9px",
              color: "var(--text-secondary)",
            }}
          >
            <span>{progressLabel || "Progress"}</span>
            <span style={{ color: hasProgress ? accent : `${accent}55` }}>
              {hasProgress ? `${Math.round(animatedProgress)}%` : "no data"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
