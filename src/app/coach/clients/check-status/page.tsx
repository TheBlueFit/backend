"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ThreeDayCheckStatus from "@/components/shared/ThreeDayCheckStatus";

export default function CoachClientCheckStatusPage() {
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setClientId(params.get("clientId") || "");
  }, []);

  if (!clientId) {
    return (
      <div className="container" style={{ maxWidth: "900px", paddingBottom: "60px" }}>
        <Link
          href="/coach/clients"
          className="btn-secondary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            textDecoration: "none",
            marginBottom: 22,
          }}
        >
          <ArrowLeft size={14} /> Back to clients
        </Link>

        <div className="app-card" style={{ padding: "28px" }}>
          <div className="label-text" style={{ marginBottom: 8 }}>
            COACH REVIEW
          </div>
          <h1
            className="animated-gradient-text"
            style={{ fontSize: "30px", textTransform: "none", marginBottom: 8 }}
          >
            Client Check Status
          </h1>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            Select a client from the Clients page to review their 3-day check status.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "900px", paddingBottom: "60px" }}>
      <Link
        href={`/coach/clients/details?id=${encodeURIComponent(clientId)}`}
        className="btn-secondary"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          textDecoration: "none",
          marginBottom: 22,
        }}
      >
        <ArrowLeft size={14} /> Back to client
      </Link>

      <div className="section-header" style={{ marginBottom: "24px" }}>
        <div>
          <div
            className="label-text"
            style={{
              color: "var(--text-secondary)",
              marginBottom: "6px",
              letterSpacing: "0.16em",
            }}
          >
            COACH REVIEW
          </div>
          <h1
            className="animated-gradient-text"
            style={{
              fontSize: "30px",
              textTransform: "none",
              marginBottom: "7px",
            }}
          >
            Client Check Status
          </h1>
          <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
            Review the client's 3-day food log and any optional photos they shared.
          </span>
        </div>
      </div>

      <ThreeDayCheckStatus mode="COACH" clientId={clientId} />
    </div>
  );
}
