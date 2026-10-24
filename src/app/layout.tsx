"use client";

import "./globals.css";
import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  CalendarCheck,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Monitor,
  Settings,
  UserPlus,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { authSession, dashboardAPI, sessionExpired, UserSession } from "@/services/api";
import ThemeProvider, { ThemeToggle, THEME_INIT_SCRIPT } from "@/components/shell/ThemeProvider";
import { AppContext } from "@/components/shell/AppContext";
import MobilePermissionsGate from "@/components/shared/MobilePermissionsGate";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ElementType;
};

const NAVIGATION: Record<"ADMIN" | "COACH" | "CLIENT", NavItem[]> = {
  ADMIN: [
    { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
    { href: "/admin/onboarding", label: "Onboarding", Icon: UserPlus },
    { href: "/admin/monitor", label: "Monitor", Icon: Monitor },
  ],
  COACH: [
    { href: "/coach", label: "Dashboard", Icon: LayoutDashboard },
    { href: "/coach/clients", label: "Client Roster", Icon: Users },
    { href: "/coach/templates", label: "Plan Templates", Icon: Activity },
    { href: "/coach/messages", label: "Messages", Icon: MessageSquare },
  ],
  CLIENT: [
    { href: "/client", label: "Today", Icon: LayoutDashboard },
    { href: "/client/diet", label: "Diet Plan", Icon: Utensils },
    { href: "/client/check-in", label: "Check-In", Icon: CalendarCheck },
    { href: "/client/check-status", label: "Check Status", Icon: Activity },
    { href: "/client/messages", label: "Messages", Icon: MessageSquare },
  ],
};

const PORTAL_LABEL: Record<"ADMIN" | "COACH" | "CLIENT", string> = {
  ADMIN: "MASTER ADMIN",
  COACH: "COACH PORTAL",
  CLIENT: "ATHLETE PORTAL",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [unread, setUnread] = useState(0);
  // Fix 4 (iframe): detect iframe context with a hydration-safe external-store snapshot.
  // Server snapshot is always false; the client snapshot can safely inspect window.
  const isInIframe = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return new URLSearchParams(window.location.search).get("iframe") === "1"
          || window.self !== window.top;
      } catch {
        return true;
      }
    },
    () => false,
  );
  const pathname = usePathname();
  const router = useRouter();
  const menuOpenRef = useRef(false);
  const navRef = useRef<HTMLElement | null>(null);
  const navButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    menuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  useEffect(() => {
    const syncAuth = () => {
      let current = authSession.get();

      if (current && (!current.token || sessionExpired(current))) {
        authSession.clear();
        current = null;
      }

      setSession(current);

      if (pathname === "/") return;

      if (!current) {
        router.replace("/");
        return;
      }

      const home =
        current.role === "ADMIN"
          ? "/admin"
          : current.role === "COACH"
            ? "/coach"
            : "/client";

      const area = pathname.startsWith("/admin")
        ? "ADMIN"
        : pathname.startsWith("/coach")
          ? "COACH"
          : pathname.startsWith("/client")
            ? "CLIENT"
            : null;

      if (area && area !== current.role) {
        router.replace(home);
      }
    };

    syncAuth();
    window.addEventListener("bluefit:auth-change", syncAuth);
    return () => window.removeEventListener("bluefit:auth-change", syncAuth);
  }, [pathname, router]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Left-edge swipe opens the one unified navigation.
  // Right swipe closes it. There is deliberately no right-side navigation gesture.
  useEffect(() => {
    const EDGE = 32;
    const MIN_DX = 60;
    const RATIO = 1.5;
    const MAX_MS = 900;
    let start: { x: number; y: number; t: number } | null = null;

    const ignored = (target: EventTarget | null) =>
      !!(target as HTMLElement | null)?.closest?.(
        'input, textarea, select, [contenteditable="true"], [data-no-swipe]'
      );

    const begin = (x: number, y: number, target: EventTarget | null) => {
      start = ignored(target) ? null : { x, y, t: Date.now() };
    };

    const finish = (x: number, y: number) => {
      if (!start) return;

      const { x: sx, y: sy, t } = start;
      start = null;

      const dx = x - sx;
      const dy = y - sy;
      const duration = Date.now() - t;

      if (
        Math.abs(dx) < MIN_DX ||
        Math.abs(dx) < Math.abs(dy) * RATIO ||
        duration > MAX_MS
      ) {
        return;
      }

      if (dx > 0 && !menuOpenRef.current && sx <= EDGE) {
        setIsMenuOpen(true);
      } else if (dx < 0 && menuOpenRef.current) {
        setIsMenuOpen(false);
      }
    };

    const onTouchStart = (event: TouchEvent) =>
      begin(event.touches[0].clientX, event.touches[0].clientY, event.target);
    const onTouchEnd = (event: TouchEvent) =>
      finish(event.changedTouches[0].clientX, event.changedTouches[0].clientY);

    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 0) {
        begin(event.clientX, event.clientY, event.target);
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      if (window.getSelection()?.toString()) {
        start = null;
        return;
      }
      finish(event.clientX, event.clientY);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // The menu is a floating right-side stack, not a drawer. Clicking outside
  // the stack closes it without darkening or shifting the dashboard.
  useEffect(() => {
    if (!isMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (navRef.current?.contains(target)) return;
      if (navButtonRef.current?.contains(target)) return;

      setIsMenuOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    let handle: { remove: () => Promise<void> } | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const listener = await App.addListener("backButton", ({ canGoBack }) => {
          if (menuOpenRef.current) {
            setIsMenuOpen(false);
            return;
          }

          if (canGoBack) window.history.back();
          else App.exitApp();
        });

        if (cancelled) {
          await listener.remove();
        } else {
          handle = listener;
        }
      } catch {
        // Browser environment or Capacitor App plugin unavailable.
      }
    })();

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, []);

  // Register PWA service worker (enables "Add to Home Screen" on iOS Safari)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silently ignore — SW is a progressive enhancement
      });
    }
  }, []);

  const beat = React.useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await dashboardAPI.ping();
      setUnread(res.unreadMessages || 0);
    } catch { /* offline or signed out */ }
  }, []);

  useEffect(() => {
    if (!session?.token) return;
    beat();
    const id = window.setInterval(beat, 45_000);
    const onVisible = () => { if (document.visibilityState === "visible") beat(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", beat);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", beat);
    };
  }, [session?.PK, session?.token, beat]);

  const handleLogout = () => {
    dashboardAPI.logout().catch(() => {});
    authSession.clear();
    setIsMenuOpen(false);
    router.replace("/");
  };

  // Fix: schedule viewer is always a bare render. This prevents the global
  // navigation and permissions gate from ever covering the in-app schedule preview.
  if (isInIframe || pathname === "/client/schedules/view") {
    return (
      <html lang="en" className="dark" suppressHydrationWarning>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#000000" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="BlueFit" />
          <link rel="apple-touch-icon" href="/icons/icon-192.png" />
          <link rel="apple-touch-startup-image" href="/icons/icon-512.png" />
        </head>
        <body style={{ margin: 0, background: "var(--bg-elev)" }}>
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    );
  }

  if (pathname === "/") {
    return (
      <html lang="en" className="dark" suppressHydrationWarning>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#000000" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="BlueFit" />
          <link rel="apple-touch-icon" href="/icons/icon-192.png" />
          <link rel="apple-touch-startup-image" href="/icons/icon-512.png" />
        </head>
        <body>
          <ThemeProvider>
            <div className="theme-fab"><ThemeToggle compact /></div>
            <main className="main-content" style={{ width: "100%" }}>
              {children}
            </main>
          </ThemeProvider>
        </body>
      </html>
    );
  }

  const role = session?.role;
  const items = role ? NAVIGATION[role] : [];
  const portalLabel = role ? PORTAL_LABEL[role] : "THE BLUE FIT";

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
       <ThemeProvider>
        <AppContext.Provider value={{ session, unread, setUnread, refreshUnread: beat }}>
        <div className="app-container">
          <header className="mobile-header">
            <span className="glazy-title" style={{ fontSize: "18px" }}>
              The Blue Fit{session?.userCode ? ` • ${session.userCode}` : ""}
            </span>
          </header>

          {/* The only global navigation trigger. */}
          <button
            ref={navButtonRef}
            className={`nav-fab nav-fab-left ${isMenuOpen ? "active" : ""}`}
            aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isMenuOpen}
            aria-controls="bluefit-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? (
              <X size={24} color="currentColor" />
            ) : (
              <Menu size={24} color="currentColor" />
            )}
          </button>

          <div className="theme-fab"><ThemeToggle compact /></div>

          {/* Floating navigation stack. It pops out from the left-side hamburger
              using the compact button treatment from the original reference UI. */}
          <nav
            ref={navRef}
            id="bluefit-navigation"
            className={`bluefit-pop-nav ${isMenuOpen ? "open" : ""} role-${role?.toLowerCase() ?? "client"}`}
            aria-label="Primary navigation"
            aria-hidden={!isMenuOpen}
          >
            {items.map(({ href, label, Icon }, index) => {
              const current =
                pathname === href ||
                (href !== "/admin" &&
                  href !== "/coach" &&
                  href !== "/client" &&
                  pathname.startsWith(`${href}/`));

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={current ? "page" : undefined}
                  onClick={() => setIsMenuOpen(false)}
                  className={`bluefit-pop-nav-item ${current ? "current" : ""}`}
                  style={{ "--nav-i": index } as React.CSSProperties}
                >
                  <Icon size={21} strokeWidth={1.8} />
                  <span>{label}</span>
                  {href.endsWith("/messages") && unread > 0 && <span className="msg-badge">{unread > 99 ? "99+" : unread}</span>}
                  <span className="bluefit-pop-nav-indicator" aria-hidden="true" />
                </Link>
              );
            })}

            <button
              type="button"
              className="bluefit-pop-nav-signout"
              onClick={handleLogout}
            >
              <LogOut size={19} strokeWidth={1.8} />
              <span>Sign Out</span>
            </button>
          </nav>

          <MobilePermissionsGate>
            <main className="main-content">{children}</main>
          </MobilePermissionsGate>
        </div>
        </AppContext.Provider>
       </ThemeProvider>
      </body>
    </html>
  );
}
