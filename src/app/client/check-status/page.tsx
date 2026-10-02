"use client";

import React from "react";
import ThreeDayCheckStatus from "@/components/shared/ThreeDayCheckStatus";

export default function ClientCheckStatusPage() {
  return (
    <div className="container" style={{ maxWidth: "900px", paddingBottom: "60px" }}>
      <div className="section-header" style={{ marginBottom: "24px" }}>
        <div>
          <div className="label-text" style={{ color: "var(--text-secondary)", marginBottom: "6px", letterSpacing: "0.16em" }}>
            ATHLETE PORTAL
          </div>
          <h1 className="animated-gradient-text" style={{ fontSize: "30px", textTransform: "none", marginBottom: "7px" }}>
            Check Status
          </h1>
          <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
            Review your onboarding progress and keep your 3-day log up to date.
          </span>
        </div>
      </div>

      <ThreeDayCheckStatus mode="CLIENT" />
    </div>
  );
}
