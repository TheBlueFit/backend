"use client";
/**
 * MediaViewerModal
 * ─────────────────
 * Renders any S3 media object (image) inside an in-app modal panel
 * using a short-lived presigned URL fetched from the backend.
 *
 * WHY: Raw S3 presigned URLs opened in a browser tab leak session context,
 * break the in-app UX, and can't be styled. This component fetches the URL
 * via the authenticated /media/view endpoint and renders the image in-app.
 *
 * Usage:
 *   <MediaViewerModal objectKey="clients/abc/photo.jpg" onClose={() => …} />
 */

import React, { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { dashboardAPI } from "@/services/api";

interface Props {
  /** The S3 object key (not a URL). */
  objectKey: string;
  /** Optional display title shown in the modal header. */
  title?: string;
  onClose: () => void;
}

type LoadState = "loading" | "ready" | "error";

export default function MediaViewerModal({ objectKey, title, onClose }: Props) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Fetch presigned view URL from the backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await dashboardAPI.getMediaViewUrl(objectKey);
        if (!cancelled) {
          setImageUrl(res.viewUrl);
          setLoadState("ready");
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err.message || "Could not load image.");
          setLoadState("error");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [objectKey]);

  // Escape key closes
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const fileName = objectKey.split("/").pop() || "Image";
  const displayTitle = title || fileName;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 950, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 951,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "env(safe-area-inset-top, 16px) 16px env(safe-area-inset-bottom, 16px)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "800px",
            maxHeight: "100%",
            background: "rgba(14,14,22,0.98)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "20px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            pointerEvents: "auto",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: "#E5B869", margin: "0 0 2px", fontWeight: 700 }}>
                Image Viewer
              </p>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayTitle}
              </p>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              {loadState === "ready" && (
                <>
                  <button
                    onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                    title="Zoom out"
                    style={controlBtn}
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", minWidth: "36px", textAlign: "center" }}>
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom(z => Math.min(4, z + 0.25))}
                    title="Zoom in"
                    style={controlBtn}
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    title="Rotate"
                    style={controlBtn}
                  >
                    <RotateCw size={16} />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                aria-label="Close viewer"
                style={{ ...controlBtn, marginLeft: "4px" }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Image area */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              minHeight: "300px",
              background: "rgba(0,0,0,0.4)",
            }}
          >
            {loadState === "loading" && (
              <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                <Loader2 size={32} style={{ animation: "spin 1s linear infinite", marginBottom: "12px" }} />
                <p style={{ fontSize: "13px", margin: 0 }}>Loading image…</p>
              </div>
            )}

            {loadState === "error" && (
              <div style={{ textAlign: "center", padding: "32px" }}>
                <AlertCircle size={36} color="#FF453A" style={{ marginBottom: "12px" }} />
                <p style={{ color: "#FF453A", fontWeight: 600, margin: "0 0 8px" }}>Could not load image</p>
                <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>{errorMsg}</p>
              </div>
            )}

            {loadState === "ready" && imageUrl && (
              <div style={{ overflow: "auto", maxWidth: "100%", maxHeight: "100%" }}>
                <img
                  src={imageUrl}
                  alt={displayTitle}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    borderRadius: "12px",
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                    transition: "transform 0.2s ease",
                    cursor: zoom > 1 ? "grab" : "default",
                  }}
                  onError={() => {
                    setLoadState("error");
                    setErrorMsg("Image failed to load. The link may have expired.");
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0 }}>
              {objectKey}
            </p>
            <button
              onClick={onClose}
              style={{
                padding: "8px 20px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const controlBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  color: "#fff",
  cursor: "pointer",
  padding: "6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
