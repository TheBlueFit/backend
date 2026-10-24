"use client";

import React from "react";
import type { Presence } from "@/services/api";
import { PRESENCE_COLOR, PRESENCE_LABEL, initials, timeAgo } from "@/lib/format";

export function PresenceDot({ presence, size = 10 }: { presence: Presence; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block", width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: PRESENCE_COLOR[presence],
        boxShadow: presence === "ONLINE" ? "0 0 0 3px rgb(var(--green-rgb) / 0.18)" : "none",
      }}
    />
  );
}

/** Small pill: "● Online" / "● Seen 3h ago" / "● Signed out". Colours come from the theme. */
export function PresenceBadge({ presence: p, lastSeenAt }: { presence?: Presence; lastSeenAt?: string | null }) {
  const presence: Presence = p ?? "NEVER";
  const label = presence === "ONLINE" ? "Online" : presence === "NEVER" ? "Never signed in" : `Seen ${timeAgo(lastSeenAt)}`;
  const color = PRESENCE_COLOR[presence];
  return (
    <span
      title={PRESENCE_LABEL[presence]}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 999,
        fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color,
        border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      <PresenceDot presence={presence} size={7} />
      {label}
    </span>
  );
}

export function Avatar({ name, presence, size = 40 }: { name?: string; presence?: Presence; size?: number }) {
  return (
    <span
      style={{
        position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        width: size, height: size, borderRadius: "50%", fontSize: size * 0.36, fontWeight: 700,
        background: "rgb(var(--ink-rgb) / 0.07)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)",
      }}
    >
      {initials(name)}
      {presence && presence !== "NEVER" && (
        <span style={{ position: "absolute", right: -1, bottom: -1, border: "2px solid var(--bg-app)", borderRadius: "50%", display: "flex" }}>
          <PresenceDot presence={presence} size={Math.max(9, size * 0.26)} />
        </span>
      )}
    </span>
  );
}
