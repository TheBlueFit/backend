import os

project_files = {

    # 1. RESPONSIVE GLOBALS.CSS (MOBILE, TABLET & DESKTOP GLASSMORPHIC ENGINE)
    "src/app/globals.css": r'''
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --accent-gold: #E5B869;
  --accent-green: #00E27B;
  --accent-blue: #60A5FA;
  --accent-red: #FF453A;
  --bg-app: #050507;
  --bg-card-surface: rgba(18, 18, 24, 0.65);
  --bg-input: rgba(255, 255, 255, 0.035);
  --bg-input-hover: rgba(255, 255, 255, 0.07);
  --bg-accordion-body: rgba(0, 0, 0, 0.6);
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-focus: rgba(255, 255, 255, 0.22);
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius: 0.625rem;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  background-color: var(--bg-app);
  background-image: 
    radial-gradient(circle at 15% 10%, rgba(96, 165, 250, 0.06), transparent 35%),
    radial-gradient(circle at 85% 20%, rgba(229, 184, 105, 0.05), transparent 35%),
    radial-gradient(circle at 50% 90%, rgba(0, 226, 123, 0.04), transparent 40%);
  color: var(--text-primary);
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

.glazy-title {
  color: #F8FAFC;
  font-weight: 800;
  font-size: clamp(24px, 4vw, 34px);
  letter-spacing: -0.5px;
  line-height: 1.15;
  text-shadow:
    0px 2px 4px rgba(0, 0, 0, 0.8),
    0px 0px 24px rgba(229, 184, 105, 0.25);
}

/* =========================================================
   APP SHELL, TOP GLASS BAR & SCROLLABLE VIEWPORT
   ========================================================= */
.app-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Fixed Top Glassmorphic Header Bar */
.universal-top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: calc(64px + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) 20px 0 20px;
  background: rgba(8, 8, 12, 0.78);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1030;
}

.top-bar-brand-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-primary);
}

.top-bar-brand-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-green);
  box-shadow: 0 0 8px var(--accent-green);
}

/* Scrollable Main Viewport with Visible Custom Scrollbar */
.main-content {
  width: 100%;
  height: 100vh;
  padding: calc(84px + env(safe-area-inset-top)) 20px 64px 20px;
  overflow-y: scroll !important;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch !important;
  overscroll-behavior-y: contain !important;
}

.container {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.app-card {
  background: var(--bg-card-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 22px;
  padding: clamp(18px, 3.5vw, 32px);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
  width: 100%;
  display: flex;
  flex-direction: column;
}

/* =========================================================
   TOP-LEFT HAMBURGER & COLLAPSIBLE LEFT DRAWER
   ========================================================= */
.universal-hamburger-btn {
  position: fixed;
  top: calc(10px + env(safe-area-inset-top));
  left: 16px;
  z-index: 1110;
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: rgba(18, 18, 24, 0.9);
  border: 1px solid var(--border-subtle);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.universal-hamburger-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--border-focus);
  transform: translateY(-1px);
}

.main-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 290px;
  max-width: 84vw;
  height: 100vh;
  background: rgba(10, 10, 15, 0.94);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border-right: 1px solid var(--border-subtle);
  z-index: 1120;
  padding: calc(20px + env(safe-area-inset-top)) 20px 24px 20px;
  display: flex;
  flex-direction: column;
  transform: translateX(-105%);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 16px 0 48px rgba(0, 0, 0, 0.85);
}

.main-sidebar.open {
  transform: translateX(0);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 18px;
  margin-bottom: 22px;
  border-bottom: 1px solid var(--border-subtle);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  text-decoration: none;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.sidebar-nav-item:hover {
  background: var(--bg-input-hover);
  border-color: var(--border-focus);
  transform: translateX(4px);
}

.sidebar-nav-item.active {
  background: rgba(229, 184, 105, 0.14);
  border-color: rgba(229, 184, 105, 0.45);
  color: var(--accent-gold);
  box-shadow: 0 6px 20px rgba(229, 184, 105, 0.12);
}

/* =========================================================
   TOP-RIGHT FLOATING DARK GLASS SUB-NAV (GEAR / DUMBBELL / PLATE)
   ========================================================= */
.floating-subnav-trigger {
  position: fixed;
  top: calc(10px + env(safe-area-inset-top));
  right: 20px;
  z-index: 1110;
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: rgba(18, 18, 24, 0.9);
  border: 1px solid var(--border-subtle);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.floating-subnav-trigger:hover,
.floating-subnav-trigger.active {
  background: rgba(255, 255, 255, 0.09);
  border-color: var(--accent-gold);
  box-shadow: 0 0 20px rgba(229, 184, 105, 0.28);
}

.floating-subnav-menu {
  position: fixed;
  top: calc(62px + env(safe-area-inset-top));
  right: 20px;
  z-index: 1115;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  pointer-events: none;
}

.floating-subnav-menu.open {
  pointer-events: auto;
}

.floating-glass-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  min-width: 210px;
  border-radius: 14px;
  background: rgba(14, 14, 20, 0.92);
  border: 1px solid var(--border-subtle);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  color: var(--text-primary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.3px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.8);
  cursor: pointer;
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
  transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}

.floating-subnav-menu.open .floating-glass-pill {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.floating-glass-pill:hover {
  background: rgba(255, 255, 255, 0.09);
  border-color: var(--border-focus);
  transform: translateX(-4px) !important;
}

.floating-glass-pill.active-pill {
  background: rgba(229, 184, 105, 0.15);
  border-color: rgba(229, 184, 105, 0.5);
  color: #FFFFFF;
  box-shadow: 0 8px 24px rgba(229, 184, 105, 0.2);
}

.universal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1090;
  animation: fadeIn 0.2s ease forwards;
}

/* =========================================================
   COMPONENTS: HEADERS, KPI GRIDS, TABS & CARDS
   ========================================================= */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.section-header h2 {
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0;
}

.label-text {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.8px;
}

/* Responsive KPI Grid */
.results-summary {
  margin-bottom: 28px;
}

.macro-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
  gap: 14px;
}

.macro-pill {
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  padding: 16px 18px;
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  backdrop-filter: blur(12px);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.macro-pill:hover {
  border-color: var(--border-focus);
  transform: translateY(-2px);
}

.macro-pill strong {
  color: var(--text-primary);
  font-size: clamp(20px, 3vw, 26px);
  font-weight: 800;
}

/* Responsive Tab Row */
.button-row {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-subtle);
  flex-wrap: wrap;
}

.btn-primary {
  flex: 1;
  min-width: 140px;
  background-color: var(--text-primary);
  color: #000000;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  padding: 13px 18px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.btn-secondary {
  flex: 1;
  min-width: 140px;
  background-color: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 13px 18px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-secondary:hover {
  background-color: var(--bg-input-hover);
  border-color: var(--border-focus);
}

/* Scrollable Plan Cards Container */
.plan-cards-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 460px;
  overflow-y: auto !important;
  padding-right: 6px;
}

.plan-card {
  background-color: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all 0.2s ease;
}

.plan-card:hover {
  background-color: var(--bg-input-hover);
  border-color: var(--border-focus);
}

.plan-card-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.plan-item-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.plan-item-category {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.plan-card-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

/* Custom Dark Scrollbars */
.main-content::-webkit-scrollbar,
.plan-cards-container::-webkit-scrollbar,
.scrollable-body::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track,
.plan-cards-container::-webkit-scrollbar-track,
.scrollable-body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
}

.main-content::-webkit-scrollbar-thumb,
.plan-cards-container::-webkit-scrollbar-thumb,
.scrollable-body::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.main-content::-webkit-scrollbar-thumb:hover,
.plan-cards-container::-webkit-scrollbar-thumb:hover,
.scrollable-body::-webkit-scrollbar-thumb:hover {
  background-color: var(--accent-gold);
}

/* Animations & Typography Effects */
.animated-gradient-text {
  background: linear-gradient(270deg, var(--accent-gold), #FFF, var(--accent-green), var(--accent-gold));
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 6s ease infinite;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.pulse-text {
  animation: textPulse 2.5s infinite alternate;
}

@keyframes textPulse {
  0% { text-shadow: 0 0 4px rgba(255, 255, 255, 0.1); }
  100% { text-shadow: 0 0 14px rgba(0, 226, 123, 0.55); }
}

.fade-in {
  animation: fadeIn 0.3s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.error-banner {
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 69, 58, 0.1);
  border: 1px solid rgba(255, 69, 58, 0.3);
  border-radius: var(--radius-md);
  color: #FF453A;
  font-size: 13px;
  backdrop-filter: blur(10px);
}

/* =========================================================
   MOBILE & SMALL TABLET BREAKPOINTS (< 640px)
   ========================================================= */
@media (max-width: 640px) {
  .main-content {
    padding: calc(76px + env(safe-area-inset-top)) 12px 48px 12px;
  }

  .app-card {
    padding: 16px;
    border-radius: 18px;
  }

  .macro-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .macro-pill {
    padding: 14px;
  }

  .plan-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 14px 16px;
    gap: 12px;
  }

  .plan-card-left {
    width: 100%;
    max-width: 100%;
  }

  .plan-card-right {
    width: 100%;
    justify-content: space-between;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .button-row {
    flex-direction: column;
    gap: 8px;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
''',

    # 2. ROOT LAYOUT WITH FROSTED TOP HEADER BAR + HAMBURGER + SWIPE GESTURES
    "src/app/layout.tsx": r'''
"use client";
import './globals.css';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Shield, Dumbbell, Activity } from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isMainNavOpen, setIsMainNavOpen] = useState(false);
  const pathname = usePathname();
  const gestureStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setIsMainNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const setupNativeListeners = async () => {
      try {
        const { App } = await import('@capacitor/app');
        App.addListener('backButton', ({ canGoBack }) => {
          if (isMainNavOpen) {
            setIsMainNavOpen(false);
          } else if (!canGoBack) {
            App.exitApp();
          } else {
            window.history.back();
          }
        });
      } catch {
        // Web browser mode
      }
    };
    setupNativeListeners();
  }, [isMainNavOpen]);

  useEffect(() => {
    const handleStart = (clientX: number, clientY: number) => {
      gestureStart.current = { x: clientX, y: clientY };
    };

    const handleEnd = (clientX: number, clientY: number) => {
      if (!gestureStart.current) return;
      const dx = clientX - gestureStart.current.x;
      const dy = clientY - gestureStart.current.y;
      const startX = gestureStart.current.x;
      const screenWidth = window.innerWidth;
      gestureStart.current = null;

      if (Math.abs(dx) < 65 || Math.abs(dx) < Math.abs(dy) * 1.4) return;

      if (dx > 0) {
        if (startX < 75 && !isMainNavOpen) {
          setIsMainNavOpen(true);
          window.dispatchEvent(new CustomEvent('bluefit:subnav', { detail: { action: 'close' } }));
        } else {
          window.dispatchEvent(new CustomEvent('bluefit:subnav', { detail: { action: 'close' } }));
        }
      } else {
        if (isMainNavOpen) {
          setIsMainNavOpen(false);
        } else if (startX > screenWidth - 90) {
          window.dispatchEvent(new CustomEvent('bluefit:subnav', { detail: { action: 'open' } }));
        }
      }
    };

    const onTouchStart = (e: TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd = (e: TouchEvent) => handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    const onMouseDown = (e: MouseEvent) => handleStart(e.clientX, e.clientY);
    const onMouseUp = (e: MouseEvent) => handleEnd(e.clientX, e.clientY);

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isMainNavOpen]);

  const navLinks = [
    { label: 'Athlete Portal', href: '/client', icon: Activity, match: '/client' },
    { label: 'Coach Portal', href: '/coach', icon: Dumbbell, match: '/coach' },
    { label: 'Master Admin', href: '/admin', icon: Shield, match: '/admin' },
  ];

  const activePortalLabel =
    pathname.startsWith('/admin') ? 'Master Admin' :
    pathname.startsWith('/coach') ? 'Coach Portal' :
    pathname.startsWith('/client') ? 'Athlete Portal' : 'The Blue Fit';

  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <div className="app-container">
          {/* Fixed Frosted Glass Top Bar */}
          <header className="universal-top-bar">
            <div className="top-bar-brand-pill">
              <span className="top-bar-brand-dot" />
              <span>{activePortalLabel}</span>
            </div>
          </header>

          {/* Top-Left Hamburger Button */}
          <button
            onClick={() => setIsMainNavOpen(prev => !prev)}
            className="universal-hamburger-btn"
            aria-label="Toggle Main Navigation"
            title="Main Navigation"
          >
            {isMainNavOpen ? <X size={21} color="var(--accent-gold)" /> : <Menu size={21} />}
          </button>

          {/* Backdrop when Main Left Drawer is open */}
          {isMainNavOpen && (
            <div className="universal-backdrop" onClick={() => setIsMainNavOpen(false)} />
          )}

          {/* Collapsible & Expandable Main Left Navigation Drawer */}
          <aside className={`main-sidebar ${isMainNavOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
              <div>
                <h2 className="glazy-title" style={{ fontSize: '22px', margin: 0 }}>The Blue Fit</h2>
                <span className="label-text" style={{ fontSize: '10px' }}>Unified Performance OS</span>
              </div>
              <button
                onClick={() => setIsMainNavOpen(false)}
                className="icon-btn"
                style={{ color: 'var(--text-secondary)', padding: '6px' }}
              >
                <X size={20} />
              </button>
            </div>

            <nav className="sidebar-nav">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.match);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMainNavOpen(false)}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={19} color={isActive ? 'var(--accent-gold)' : '#FFFFFF'} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Tip: Swipe right from left edge for Main Menu, or left from right edge for Tools.
            </div>
          </aside>

          {/* Scrollable Main Content */}
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
'''
}

for path, content in project_files.items():
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Styled & Synced: {path}")

print("\nResponsive glassmorphism upgrade complete! Check your browser and resize between mobile and desktop widths.")