"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, Users } from "lucide-react";
import { ChatThread as ThreadRow, dashboardAPI } from "@/services/api";
import ChatThread from "@/components/messaging/ChatThread";
import { Avatar } from "@/components/shared/Presence";
import { timeAgo } from "@/lib/format";
import { useApp } from "@/components/shell/AppContext";

function CoachMessages() {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("client");
  const { unread, refreshUnread } = useApp();
  const [threads, setThreads] = useState<ThreadRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await dashboardAPI.getThreads();
      setThreads(r.threads);
      setError(null);
    } catch (e: any) { setError(e?.message || "Could not load conversations."); setThreads((t) => t ?? []); }
  }, []);

  useEffect(() => { load(); }, [load, unread]);
  useEffect(() => {
    const id = window.setInterval(() => document.visibilityState === "visible" && load(), 8000);
    return () => window.clearInterval(id);
  }, [load]);

  const open = (id: string | null) => router.replace(id ? `/coach/messages?client=${encodeURIComponent(id)}` : "/coach/messages");
  const current = threads?.find((t) => t.clientId === selected) || null;

  return (
    <div className="container" style={{ maxWidth: "1100px", paddingBottom: 20 }}>
      <div className="section-header" style={{ marginBottom: 18 }}>
        <div>
          <h2 className="animated-gradient-text" style={{ fontSize: "28px", textTransform: "none", marginBottom: 6 }}>Messages</h2>
          <span className="label-text" style={{ color: "var(--text-secondary)", textTransform: "none" }}>Conversations with your assigned clients.</span>
        </div>
      </div>
      <div className={`bf-chat-split${selected ? " has-thread" : ""}`}>
        <div className="bf-chat-list">
          <div className="bf-chat-head"><strong style={{ fontSize: 15 }}>Clients</strong></div>
          <div className="bf-chat-threads">
            {threads === null ? (
              <div className="bf-chat-empty">Loading…</div>
            ) : threads.length === 0 ? (
              <div className="bf-chat-empty"><Users size={24} /><strong style={{ color: "var(--text-primary)" }}>No clients yet</strong><span>Clients assigned to you will show up here.</span></div>
            ) : threads.map((t) => (
              <button key={t.clientId} type="button" className={`bf-chat-thread${t.clientId === selected ? " on" : ""}`} onClick={() => open(t.clientId)}>
                <Avatar name={t.peer?.name} presence={t.peer?.presence} />
                <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span className="bf-chat-name" style={{ fontWeight: t.unread ? 700 : 600 }}>{t.peer?.name || t.clientId}</span>
                    <span style={{ flex: "none", fontSize: 10, color: "var(--text-secondary)" }}>{t.lastMessageAt ? timeAgo(t.lastMessageAt) : ""}</span>
                  </span>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 3 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.lastMessageText ? `${t.lastSender === "COACH" ? "You: " : ""}${t.lastMessageText}` : "No messages yet"}</span>
                    {t.unread > 0 && <span className="msg-badge" style={{ margin: 0 }}>{t.unread}</span>}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bf-chat-pane">
          {selected ? (
            <ChatThread key={selected} clientId={selected} fallbackPeer={current?.peer ?? null} onBack={() => { open(null); load(); refreshUnread(); }} />
          ) : (
            <div className="bf-chat-empty"><MessageSquare size={28} /><strong style={{ color: "var(--text-primary)" }}>Select a conversation</strong><span>{error || "Pick a client on the left to read and reply."}</span></div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CoachMessagesPage() {
  return <Suspense fallback={<div className="container" style={{ color: "var(--text-secondary)" }}>Loading…</div>}><CoachMessages /></Suspense>;
}
