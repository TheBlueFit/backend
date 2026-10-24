import type { Presence } from "@/services/api";

export const fmtNum = (n: number | null | undefined, digits = 0) =>
  n == null || !Number.isFinite(Number(n)) ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const pct = (n: number | null | undefined) => (n == null || !Number.isFinite(Number(n)) ? "—" : `${Math.round(Number(n))}%`);

export function timeAgo(iso?: string | null): string {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return "Just now";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : "—";
}

export const initials = (name?: string) =>
  (name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "?";

export const PRESENCE_LABEL: Record<Presence, string> = {
  ONLINE: "Online now", TODAY: "Active today", RECENT: "Active this week", INACTIVE: "Inactive", NEVER: "Never signed in",
};
export const PRESENCE_COLOR: Record<Presence, string> = {
  ONLINE: "var(--accent-green)", TODAY: "var(--blue)", RECENT: "var(--accent-gold)", INACTIVE: "var(--text-secondary)", NEVER: "var(--text-secondary)",
};

/** Adds transparency to any CSS colour (hex or var(--token)). `hh` is a 2-digit hex alpha like "55". */
export const mix = (color: string, hh: string) =>
  `color-mix(in srgb, ${color} ${Math.round((parseInt(hh, 16) / 255) * 100)}%, transparent)`;
