"use client";
/**
 * MediaViewerModal
 * ─────────────────
 * Shows a stored photo INSIDE the app as an iframe popup — the user never leaves
 * the app or lands on a raw S3 link.
 *
 * Pass either:
 *   • objectKey – the S3 key; a short-lived signed link is requested from the
 *                 authenticated /media/view endpoint, or
 *   • url       – an already-signed link (older records that only carry viewUrl).
 *
 * The image is rendered by a sandboxed iframe (srcDoc, scripts only — no access to the
 * app's storage or session) that has its own zoom / rotate / reset controls.
 */

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Image as ImageIcon, Loader2, X } from "lucide-react";
import { dashboardAPI } from "@/services/api";

interface Props {
  /** The S3 object key (not a URL). */
  objectKey?: string;
  /** A ready-to-use signed image link, used when no objectKey is known. */
  url?: string;
  /** Optional display title shown in the modal header. */
  title?: string;
  onClose: () => void;
}

type LoadState = "loading" | "ready" | "error";

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Self-contained page that lives inside the iframe. */
function buildFrameDoc(src: string, alt: string): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<style>
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;background:var(--bg-elev);color:var(--text-primary);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overflow:hidden}
  #stage{position:absolute;inset:0 0 56px 0;overflow:auto;display:flex;padding:14px;-webkit-overflow-scrolling:touch}
  #box{position:relative;margin:auto;flex:none}
  #im{position:absolute;left:50%;top:50%;max-width:none;border-radius:10px;box-shadow:0 12px 40px rgb(var(--shadow-rgb) / .55);transition:width .18s ease,height .18s ease,transform .18s ease;user-select:none;-webkit-user-drag:none}
  #bar{position:absolute;left:0;right:0;bottom:0;height:56px;display:flex;align-items:center;justify-content:center;gap:8px;background:rgb(var(--ink-rgb) / .04);border-top:1px solid rgb(var(--ink-rgb) / .08)}
  button{height:36px;min-width:40px;padding:0 12px;border-radius:9px;border:1px solid rgb(var(--ink-rgb) / .14);background:rgb(var(--ink-rgb) / .07);color:var(--text-primary);font:600 13px inherit;cursor:pointer}
  button:hover{background:rgb(var(--ink-rgb) / .14)}
  #pct{min-width:48px;text-align:center;font-size:12px;color:rgb(var(--ink-rgb) / .65)}
  #err{display:none;margin:auto;max-width:320px;text-align:center;line-height:1.5;color:rgb(var(--ink-rgb) / .72);font-size:13px}
  #err b{display:block;color:var(--danger);font-size:15px;margin-bottom:6px}
</style></head><body>
<div id="stage">
  <div id="box"><img id="im" alt="${esc(alt)}" src="${esc(src)}" draggable="false"></div>
  <div id="err"><b>Can't show this photo</b>The link may have expired, or the format (for example HEIC) can't be previewed here. Close this window and try again.</div>
</div>
<div id="bar">
  <button id="out" aria-label="Zoom out">−</button><span id="pct">100%</span><button id="in" aria-label="Zoom in">+</button>
  <button id="rot" aria-label="Rotate">⟳ Rotate</button><button id="reset">Reset</button>
</div>
<script>
(function(){
  var im=document.getElementById('im'),box=document.getElementById('box'),stage=document.getElementById('stage'),
      pct=document.getElementById('pct'),err=document.getElementById('err');
  var zoom=1,rot=0,ready=false;
  function layout(){
    if(!ready)return;
    var r90=rot%180!==0,nw=im.naturalWidth||1,nh=im.naturalHeight||1;
    var ew=r90?nh:nw,eh=r90?nw:nh;
    var fit=Math.min((stage.clientWidth-28)/ew,(stage.clientHeight-28)/eh,1);
    var bw=ew*fit*zoom,bh=eh*fit*zoom;
    box.style.width=bw+'px';box.style.height=bh+'px';
    im.style.width=(r90?bh:bw)+'px';im.style.height=(r90?bw:bh)+'px';
    im.style.transform='translate(-50%,-50%) rotate('+rot+'deg)';
    pct.textContent=Math.round(zoom*100)+'%';
  }
  im.addEventListener('load',function(){ready=true;layout();});
  im.addEventListener('error',function(){box.style.display='none';err.style.display='block';document.getElementById('bar').style.display='none';});
  window.addEventListener('resize',layout);
  document.getElementById('in').onclick=function(){zoom=Math.min(4,zoom+0.25);layout();};
  document.getElementById('out').onclick=function(){zoom=Math.max(0.5,zoom-0.25);layout();};
  document.getElementById('rot').onclick=function(){rot=(rot+90)%360;layout();};
  document.getElementById('reset').onclick=function(){zoom=1;rot=0;layout();};
  stage.addEventListener('dblclick',function(){zoom=zoom>1?1:2;layout();});
})();
</script></body></html>`;
}

export default function MediaViewerModal({ objectKey, url, title, onClose }: Props) {
  const [loadState, setLoadState] = useState<LoadState>(url ? "ready" : "loading");
  const [imageUrl, setImageUrl] = useState<string | null>(url ?? null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (url) {
      setImageUrl(url);
      setLoadState("ready");
      return;
    }
    if (!objectKey) {
      setErrorMsg("No photo was selected.");
      setLoadState("error");
      return;
    }
    let cancelled = false;
    setLoadState("loading");
    (async () => {
      try {
        const res = await dashboardAPI.getMediaViewUrl(objectKey);
        if (!cancelled) {
          setImageUrl(res.viewUrl);
          setLoadState("ready");
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message || "Could not load image.");
          setLoadState("error");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [objectKey, url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const displayTitle = title || objectKey?.split("/").pop() || "Photo";
  const frameDoc = useMemo(
    () => (imageUrl ? buildFrameDoc(imageUrl, displayTitle) : ""),
    [imageUrl, displayTitle]
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${displayTitle} photo viewer`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        background: "rgb(var(--well-rgb) / 0.86)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))",
      }}
    >
      <div
        style={{
          width: "min(860px, 100%)", height: "min(88vh, 760px)",
          display: "flex", flexDirection: "column",
          background: "#08080c", border: "1px solid rgb(var(--ink-rgb) / 0.11)",
          borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 100px rgb(var(--well-rgb) / 0.6)",
        }}
      >
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            padding: "13px 14px 13px 20px", flexShrink: 0,
            borderBottom: "1px solid rgb(var(--ink-rgb) / 0.07)", background: "rgb(var(--ink-rgb) / 0.022)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "rgb(var(--gold-rgb) / 0.1)", color: "var(--accent-gold)", flexShrink: 0 }}>
              <ImageIcon size={16} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-gold)", fontWeight: 700 }}>Photo viewer</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayTitle}
              </div>
            </div>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close photo viewer"
            style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgb(var(--ink-rgb) / 0.12)", background: "rgb(var(--ink-rgb) / 0.05)", color: "var(--text-primary)", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ position: "relative", flex: 1, minHeight: 0, background: "var(--bg-elev)" }}>
          {loadState === "loading" && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--text-secondary)", textAlign: "center" }}>
              <div>
                <Loader2 size={30} className="spin" style={{ marginBottom: 10 }} />
                <p style={{ fontSize: 13, margin: 0 }}>Opening photo…</p>
              </div>
            </div>
          )}

          {loadState === "error" && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
              <div>
                <AlertCircle size={34} color="var(--danger)" style={{ marginBottom: 10 }} />
                <p style={{ color: "var(--danger)", fontWeight: 700, margin: "0 0 6px" }}>Could not load photo</p>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>{errorMsg}</p>
              </div>
            </div>
          )}

          {loadState === "ready" && frameDoc && (
            <iframe
              title={`${displayTitle} photo`}
              srcDoc={frameDoc}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "var(--bg-elev)" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
