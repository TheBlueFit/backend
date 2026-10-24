"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Check, CheckCheck, Loader2, Send } from "lucide-react";
import { ChatMessage, ChatPeer, dashboardAPI, NetworkError } from "@/services/api";
import { Avatar, PresenceBadge } from "@/components/shared/Presence";
import { useApp } from "@/components/shell/AppContext";

const POLL_MS = 4000;
const MAX_LEN = 2000;

const dayKey = (iso: string) => new Date(iso).toDateString();
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "").slice(0, 24) : String(Date.now()) + Math.random().toString(16).slice(2, 8));

/** Merge server messages into the local list (dedupe by id / clientMsgId) and keep time order. */
function merge(local: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const out = [...local];
  for (const m of incoming) {
    const i = out.findIndex((x) => x.id === m.id || (m.clientMsgId && x.clientMsgId === m.clientMsgId));
    if (i >= 0) out[i] = { ...m }; else out.push(m);
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

export default function ChatThread({
  clientId, onBack, fallbackPeer,
}: { clientId: string; onBack?: () => void; fallbackPeer?: ChatPeer | null }) {
  const { refreshUnread } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peer, setPeer] = useState<ChatPeer | null>(fallbackPeer ?? null);
  const [peerReadAt, setPeerReadAt] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [draft, setDraft] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);           // follow new messages only if the user is at the bottom
  const lastSyncRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const aliveRef = useRef(true);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const apply = useCallback((page: { messages: ChatMessage[]; peer: ChatPeer | null; peerLastReadAt: string | null; canSend: boolean }) => {
    setPeer(page.peer ?? null);
    setPeerReadAt(page.peerLastReadAt);
    setCanSend(page.canSend);
    setMessages((cur) => {
      const next = merge(cur, page.messages.filter((m) => !m.pending));
      const lastReal = [...next].reverse().find((m) => !m.pending && !m.failed);
      if (lastReal) lastSyncRef.current = lastReal.createdAt;
      return next;
    });
  }, []);

  // initial load
  useEffect(() => {
    aliveRef.current = true;
    setLoading(true); setError(null); setMessages([]); lastSyncRef.current = null; stickRef.current = true;
    dashboardAPI.getMessages(clientId, { limit: 60 })
      .then((page) => {
        if (!aliveRef.current) return;
        apply(page); setHasMore(page.hasMore); refreshUnread();
      })
      .catch((e) => aliveRef.current && setError(e?.message || "Could not load messages."))
      .finally(() => aliveRef.current && setLoading(false));
    return () => { aliveRef.current = false; };
  }, [clientId, apply, refreshUnread]);

  // polling for new messages (only while the tab is visible)
  useEffect(() => {
    if (loading) return;
    let busy = false;
    const tick = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const page = await dashboardAPI.getMessages(clientId, lastSyncRef.current ? { after: lastSyncRef.current } : { limit: 60 });
        if (!aliveRef.current) return;
        setOffline(false);
        const fresh = page.messages.some((m) => !m.mine);
        apply(page);
        if (fresh) refreshUnread();
      } catch (e) {
        if (e instanceof NetworkError) setOffline(true);
      } finally { busy = false; }
    };
    const id = window.setInterval(tick, POLL_MS);
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", tick);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("online", tick); };
  }, [clientId, loading, apply, refreshUnread]);

  // keep pinned to bottom when new content arrives
  useLayoutEffect(() => { if (stickRef.current) scrollToBottom(); }, [messages, loading, scrollToBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = async () => {
    const oldest = messages.find((m) => !m.pending);
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const page = await dashboardAPI.getMessages(clientId, { before: oldest.createdAt, limit: 40, markRead: false });
      stickRef.current = false;
      setMessages((cur) => merge(cur, page.messages));
      setHasMore(page.hasMore);
      requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevHeight; });
    } catch (e: any) { setError(e?.message || "Could not load earlier messages."); }
    finally { setLoadingOlder(false); }
  };

  const post = useCallback(async (text: string, clientMsgId: string) => {
    try {
      const { message } = await dashboardAPI.sendMessage(clientId, text, clientMsgId);
      setMessages((cur) => merge(cur.filter((m) => m.clientMsgId !== clientMsgId), [message]));
      lastSyncRef.current = message.createdAt > (lastSyncRef.current || "") ? message.createdAt : lastSyncRef.current;
      setError(null);
    } catch (e: any) {
      setMessages((cur) => cur.map((m) => (m.clientMsgId === clientMsgId ? { ...m, pending: false, failed: true } : m)));
      setError(e?.message || "Message not sent.");
    }
  }, [clientId]);

  const send = () => {
    const text = draft.trim();
    if (!text || text.length > MAX_LEN || !canSend) return;
    const clientMsgId = uid();
    const optimistic: ChatMessage = {
      id: `local-${clientMsgId}`, clientMsgId, sender: "CLIENT", senderName: "", text,
      createdAt: new Date().toISOString(), mine: true, pending: true,
    };
    stickRef.current = true;
    setMessages((cur) => [...cur, optimistic]);
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    post(text, clientMsgId);
  };

  const retry = (m: ChatMessage) => {
    if (!m.clientMsgId) return;
    setMessages((cur) => cur.map((x) => (x.id === m.id ? { ...x, failed: false, pending: true } : x)));
    post(m.text, m.clientMsgId);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    if (e.key === "Enter" && !e.shiftKey && !touch) { e.preventDefault(); send(); }
  };

  const autoGrow = (el: HTMLTextAreaElement) => { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 140)}px`; };

  // the last of my own messages that the other person has read gets "Seen"
  const lastSeenId = (() => {
    if (!peerReadAt) return null;
    const mine = messages.filter((m) => m.mine && !m.pending && !m.failed && m.createdAt <= peerReadAt);
    return mine.length ? mine[mine.length - 1].id : null;
  })();

  return (
    <>
      <div className="bf-chat-head">
        {onBack && (
          <button type="button" className="icon-btn" style={{ color: "var(--text-secondary)" }} onClick={onBack} aria-label="Back to conversations"><ArrowLeft size={19} /></button>
        )}
        <Avatar name={peer?.name} presence={peer?.presence} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bf-chat-name">{peer?.name || "Conversation"}</div>
          <div style={{ marginTop: 3 }}>{peer ? <PresenceBadge presence={peer.presence} lastSeenAt={peer.lastSeenAt} /> : null}</div>
        </div>
      </div>

      {offline && <div style={{ padding: "8px 14px", fontSize: 12, color: "var(--accent-gold)", background: "rgb(var(--gold-rgb) / 0.08)", borderBottom: "1px solid var(--border-subtle)" }}>You are offline — messages will send when you reconnect.</div>}

      <div className="bf-chat-scroll" ref={scrollRef} onScroll={onScroll}>
        {loading ? (
          <div className="bf-chat-empty"><Loader2 className="spin" size={22} /></div>
        ) : (
          <>
            {hasMore && (
              <button type="button" className="btn-secondary" style={{ alignSelf: "center", marginBottom: 8, flex: "none", padding: "8px 14px", fontSize: 11 }} onClick={loadOlder} disabled={loadingOlder}>
                {loadingOlder ? "Loading…" : "Load earlier messages"}
              </button>
            )}
            {messages.length === 0 && (
              <div className="bf-chat-empty">
                <strong style={{ color: "var(--text-primary)" }}>No messages yet</strong>
                <span>{canSend ? `Say hello${peer ? ` to ${peer.name}` : ""}.` : "You will be able to chat once a coach is assigned to you."}</span>
              </div>
            )}
            {messages.map((m, i) => {
              const showDay = i === 0 || dayKey(messages[i - 1].createdAt) !== dayKey(m.createdAt);
              return (
                <React.Fragment key={m.id}>
                  {showDay && <div className="bf-chat-day">{dayLabel(m.createdAt)}</div>}
                  <div className={`bf-chat-msg ${m.mine ? "mine" : "them"}${m.failed ? " failed" : ""}`}>
                    <div className="bf-chat-bubble">{m.text}</div>
                    <div className="bf-chat-meta">
                      <span>{timeOf(m.createdAt)}</span>
                      {m.mine && m.pending && <Loader2 size={11} className="spin" aria-label="Sending" />}
                      {m.mine && !m.pending && !m.failed && (m.id === lastSeenId ? <><CheckCheck size={13} style={{ color: "var(--accent-green)" }} /> Seen</> : <Check size={13} aria-label="Sent" />)}
                      {m.failed && (
                        <button type="button" onClick={() => retry(m)} style={{ background: "none", border: 0, color: "var(--danger)", cursor: "pointer", fontSize: 11, display: "inline-flex", gap: 4, alignItems: "center", padding: 0 }}>
                          <AlertCircle size={12} /> Not sent · Retry
                        </button>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </>
        )}
      </div>

      {error && <div style={{ padding: "0 12px" }}><div className="error-banner" style={{ margin: "0 0 8px" }}>{error}</div></div>}

      <div className="bf-chat-composer">
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          placeholder={canSend ? "Write a message…" : "No coach assigned yet"}
          disabled={!canSend}
          maxLength={MAX_LEN + 200}
          onChange={(e) => { setDraft(e.target.value); autoGrow(e.target); }}
          onKeyDown={onKeyDown}
          aria-label="Message"
        />
        <button type="button" className="bf-chat-send" onClick={send} disabled={!draft.trim() || draft.length > MAX_LEN || !canSend} aria-label="Send message">
          <Send size={18} />
        </button>
      </div>
      {draft.length > MAX_LEN - 200 && (
        <div style={{ padding: "0 16px 8px", fontSize: 11, color: draft.length > MAX_LEN ? "var(--danger)" : "var(--text-secondary)", textAlign: "right" }}>{draft.length}/{MAX_LEN}</div>
      )}
    </>
  );
}
