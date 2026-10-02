"use client";

import "./globals.css";
import React, { useEffect, useRef, useState } from "react";
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
  Settings,
  UserPlus,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { authSession, UserSession } from "@/services/api";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ElementType;
};

const NAVIGATION: Record<"ADMIN" | "COACH" | "CLIENT", NavItem[]> = {
  ADMIN: [
    { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
    { href: "/admin/onboarding", label: "Onboarding", Icon: UserPlus },
  ],
  COACH: [
    { href: "/coach", label: "Dashboard", Icon: LayoutDashboard },
    { href: "/coach/clients", label: "Client Roster", Icon: Users },
    { href: "/coach/templates", label: "Plan Templates", Icon: Activity },
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

      if (current && !current.token) {
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

  const handleLogout = () => {
    authSession.clear();
    setIsMenuOpen(false);
    router.replace("/");
  };

  if (pathname === "/") {
    return (
      <html lang="en" className="dark">
        <head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, viewport-fit=cover"
          />
        </head>
        <body>
          <main className="main-content" style={{ width: "100%" }}>
            {children}
          </main>
        </body>
      </html>
    );
  }

  const role = session?.role;
  const items = role ? NAVIGATION[role] : [];
  const portalLabel = role ? PORTAL_LABEL[role] : "THE BLUE FIT";

  return (
    <html lang="en" className="dark">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body>
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
              <X size={24} color="#fff" />
            ) : (
              <Menu size={24} color="#fff" />
            )}
          </button>

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

          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
