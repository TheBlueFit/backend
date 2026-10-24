"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { authSession, dashboardAPI } from "@/services/api";
import ChatThread from "@/components/messaging/ChatThread";

export default function ClientMessagesPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [hasCoach, setHasCoach] = useState<boolean | null>(null);

  useEffect(() => {
    const pk = authSession.get()?.PK;
    if (pk) setClientId(pk.split("#")[1] || pk);
    dashboardAPI.getThreads()
      .then((r) => setHasCoach(!!r.threads[0]?.peer))
      .catch(() => setHasCoach(true)); // let the thread itself report problems
  }, []);

  if (hasCoach === null || !clientId) {
    return <div className="bf-chat-shell"><div className="bf-chat-empty"><span className="spin" style={{ display: "inline-block" }}>…</span></div></div>;
  }
  if (!hasCoach) {
    return (
      <div className="bf-chat-shell">
        <div className="bf-chat-empty">
          <MessageSquare size={28} />
          <strong style={{ color: "var(--text-primary)" }}>No coach assigned yet</strong>
          <span>Once the admin assigns a coach to you, your conversation will appear here.</span>
        </div>
      </div>
    );
  }
  return <div className="bf-chat-shell"><ChatThread clientId={clientId} /></div>;
}
