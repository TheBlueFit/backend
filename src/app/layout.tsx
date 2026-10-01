// "use client";
// import { useState } from 'react';
// import { Menu, X } from 'lucide-react';
// import './globals.css';

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

//   return (
//     <html lang="en">
//       <head>
//         <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
//       </head>
//       <body>
//         <div className="app-container">
          
//           {/* 1. Mobile Top Bar (Only visible on phones) */}
//           <header className="mobile-header">
//             <span className="premium-ambient-title" style={{ fontSize: '18px' }}>The Blue Fit</span>
//             <button 
//               className="hamburger-btn"
//               onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
//             >
//               {isMobileMenuOpen ? <X size={28} color="#fff" /> : <Menu size={28} color="#fff" />}
//             </button>
//           </header>

//           {/* 2. Sidebar (Hidden on mobile, slides out when active) */}
//           <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-active' : ''}`}>
//             <div style={{ padding: '24px' }}>
//               <h2 className="premium-ambient-title" style={{ fontSize: '24px', marginBottom: '32px' }}>The Blue Fit</h2>
              
//               {/* Replace with your actual Link components */}
//               <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
//                 <a href="/client" style={{ color: '#fff', textDecoration: 'none' }}>Athlete Portal</a>
//                 <a href="/coach" style={{ color: '#fff', textDecoration: 'none' }}>Coach Portal</a>
//                 <a href="/admin" style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 'bold' }}>Master Admin</a>
//               </nav>
//             </div>
//           </aside>

//           {/* 3. Frosted Glass Overlay (Click to close menu) */}
//           {isMobileMenuOpen && (
//             <div 
//               className="mobile-overlay" 
//               onClick={() => setIsMobileMenuOpen(false)}
//             />
//           )}

//           {/* 4. Main Content Area */}
//           <main className="main-content">
//             {children}
//           </main>

//         </div>
//       </body>
//     </html>
//   );
// }

// "use client";
// import { useState, useEffect, useRef } from 'react';
// import { Menu, X } from 'lucide-react';
// import Link from 'next/link';
// import { usePathname } from 'next/navigation';
// import SubNav from '@/components/shared/SubNav';
// import './globals.css';

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//   const [isSubNavOpen, setIsSubNavOpen] = useState(false);
//   const pathname = usePathname();

//   // Close every menu whenever the route changes
//   useEffect(() => {
//     setIsMobileMenuOpen(false);
//     setIsSubNavOpen(false);
//   }, [pathname]);

//   // Live mirrors of state so the gesture / back-button listeners never read stale values
//   const navOpenRef = useRef(false);
//   const subOpenRef = useRef(false);
//   const hasPortalRef = useRef(false);
//   useEffect(() => { navOpenRef.current = isMobileMenuOpen; }, [isMobileMenuOpen]);
//   useEffect(() => { subOpenRef.current = isSubNavOpen; }, [isSubNavOpen]);
//   useEffect(() => {
//     hasPortalRef.current = /^\/(admin|coach|client)(\/|$)/.test(pathname || '');
//   }, [pathname]);

//   // --- Gesture recognition: touch swipes + mouse drags, one code path ---
//   useEffect(() => {
//     const EDGE = 28;        // px from screen edge that counts as an "edge swipe"
//     const MIN_DX = 60;      // minimum horizontal travel
//     const RATIO = 1.5;      // horizontal must dominate vertical (keeps scrolling safe)
//     const MAX_MS = 900;     // slower drags are not swipes
//     let start: { x: number; y: number; t: number } | null = null;

//     const ignored = (target: EventTarget | null) =>
//       !!(target as HTMLElement | null)?.closest?.(
//         'input, textarea, select, [contenteditable="true"], [data-no-swipe]'
//       );

//     const begin = (x: number, y: number, target: EventTarget | null) => {
//       start = ignored(target) ? null : { x, y, t: Date.now() };
//     };

//     const finish = (x: number, y: number) => {
//       if (!start) return;
//       const { x: sx, y: sy, t: st } = start;
//       start = null;
//       const dx = x - sx;
//       const dy = y - sy;
//       if (Math.abs(dx) < MIN_DX || Math.abs(dx) < Math.abs(dy) * RATIO || Date.now() - st > MAX_MS) return;

//       if (dx > 0) {
//         // SWIPE RIGHT
//         if (subOpenRef.current) setIsSubNavOpen(false);                    // closes sub-nav
//         else if (!navOpenRef.current && sx <= EDGE) setIsMobileMenuOpen(true); // left-edge -> open main nav
//       } else {
//         // SWIPE LEFT
//         if (navOpenRef.current) setIsMobileMenuOpen(false);                // collapses main nav
//         else if (!subOpenRef.current && hasPortalRef.current && sx >= window.innerWidth - EDGE) {
//           setIsSubNavOpen(true);                                           // right-edge -> open sub-nav
//         }
//       }
//     };

//     const onTouchStart = (e: TouchEvent) => begin(e.touches[0].clientX, e.touches[0].clientY, e.target);
//     const onTouchEnd = (e: TouchEvent) => finish(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
//     const onMouseDown = (e: MouseEvent) => { if (e.button === 0) begin(e.clientX, e.clientY, e.target); };
//     const onMouseUp = (e: MouseEvent) => {
//       if (window.getSelection()?.toString()) { start = null; return; }   // user was selecting text
//       finish(e.clientX, e.clientY);
//     };
//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === 'Escape') { setIsMobileMenuOpen(false); setIsSubNavOpen(false); }
//     };

//     document.addEventListener('touchstart', onTouchStart, { passive: true });
//     document.addEventListener('touchend', onTouchEnd, { passive: true });
//     document.addEventListener('mousedown', onMouseDown);
//     document.addEventListener('mouseup', onMouseUp);
//     document.addEventListener('keydown', onKey);
//     return () => {
//       document.removeEventListener('touchstart', onTouchStart);
//       document.removeEventListener('touchend', onTouchEnd);
//       document.removeEventListener('mousedown', onMouseDown);
//       document.removeEventListener('mouseup', onMouseUp);
//       document.removeEventListener('keydown', onKey);
//     };
//   }, []);

//   // --- Native Android hardware back button (Capacitor) ---
//   // Closes any open menu first; only then navigates back (or exits at the root).
//   useEffect(() => {
//     let handle: { remove: () => Promise<void> } | undefined;
//     let cancelled = false;
//     (async () => {
//       try {
//         const { App } = await import('@capacitor/app');
//         const h = await App.addListener('backButton', ({ canGoBack }) => {
//           if (subOpenRef.current) { setIsSubNavOpen(false); return; }
//           if (navOpenRef.current) { setIsMobileMenuOpen(false); return; }
//           if (canGoBack) window.history.back();
//           else App.exitApp();
//         });
//         if (cancelled) h.remove(); else handle = h;
//       } catch {
//         /* plain browser, or @capacitor/app not installed: nothing to attach */
//       }
//     })();
//     return () => { cancelled = true; handle?.remove(); };
//   }, []);

//   return (
//     <html lang="en" className="dark">
//       <head>
//         <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
//       </head>
//       <body>
//         <div className="app-container">
          
//           {/* MOBILE ONLY: Top Header (title strip; buttons are the pinned FABs below) */}
//           <header className="mobile-header">
//             <span className="premium-ambient-title" style={{ fontSize: '18px' }}>The Blue Fit</span>
//           </header>

//           {/* PINNED TOP-LEFT: Hamburger (all screen sizes) */}
//           <button
//             className={`nav-fab nav-fab-left ${isMobileMenuOpen ? 'active' : ''}`}
//             aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
//             onClick={() => { setIsSubNavOpen(false); setIsMobileMenuOpen(o => !o); }}
//           >
//             {isMobileMenuOpen ? <X size={24} color="#fff" /> : <Menu size={24} color="#fff" />}
//           </button>

//           {/* PINNED TOP-RIGHT: contextual portal trigger + fan-out sub-nav */}
//           <SubNav
//             open={isSubNavOpen}
//             setOpen={(v) => { if (v) setIsMobileMenuOpen(false); setIsSubNavOpen(v); }}
//           />

//           {/* RESPONSIVE SIDEBAR: Fixed on Web, Glass Drawer on Mobile */}
//           <aside className={`main-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
//             <div className="sidebar-header">
//               <h2 className="premium-ambient-title" style={{ fontSize: '24px' }}>The Blue Fit</h2>
//             </div>
            
//             <nav className="sidebar-nav">
//               <Link href="/client" onClick={() => setIsMobileMenuOpen(false)}>Athlete Portal</Link>
//               <Link href="/coach" onClick={() => setIsMobileMenuOpen(false)}>Coach Portal</Link>
//               <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>Master Admin</Link>
//             </nav>
//           </aside>

//           {/* Blurred backdrop: click to close whichever menu is open */}
//           {(isMobileMenuOpen || isSubNavOpen) && (
//             <div
//               className="mobile-overlay"
//               onClick={() => { setIsMobileMenuOpen(false); setIsSubNavOpen(false); }}
//             />
//           )}

//           {/* MAIN DASHBOARD CONTENT */}
//           <main className="main-content">
//             {children}
//           </main>

//         </div>
//       </body>
//     </html>
//   );
// }




"use client";
import './globals.css';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { authSession, UserSession } from '@/services/api';
import SubNav from '@/components/shared/SubNav';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubNavOpen, setIsSubNavOpen] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Sync the signed-in user and keep each role inside its own area.
  // (This is for convenience: the API itself refuses anything the user is not allowed to do.)
  useEffect(() => {
    const syncAuth = () => {
      let current = authSession.get();
      // A session without a token (saved by an older build) is not a real sign-in
      if (current && !current.token) {
        authSession.clear();
        current = null;
      }
      setSession(current);

      if (pathname === '/') return; // the sign-in screen is public
      if (!current) {
        router.replace('/');
        return;
      }

      const home = current.role === 'ADMIN' ? '/admin' : current.role === 'COACH' ? '/coach' : '/client';
      const area = pathname.startsWith('/admin') ? 'ADMIN'
        : pathname.startsWith('/coach') ? 'COACH'
        : pathname.startsWith('/client') ? 'CLIENT'
        : null;
      if (area && area !== current.role) router.replace(home);
    };

    syncAuth();
    window.addEventListener('bluefit:auth-change', syncAuth);
    return () => window.removeEventListener('bluefit:auth-change', syncAuth);
  }, [pathname, router]);

  // Close every menu whenever the route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSubNavOpen(false);
  }, [pathname]);

  // Live mirrors of state so the gesture / back-button listeners never read stale values
  const navOpenRef = useRef(false);
  const subOpenRef = useRef(false);
  const hasPortalRef = useRef(false);
  useEffect(() => { navOpenRef.current = isMobileMenuOpen; }, [isMobileMenuOpen]);
  useEffect(() => { subOpenRef.current = isSubNavOpen; }, [isSubNavOpen]);
  useEffect(() => {
    hasPortalRef.current = /^\/(admin|coach|client)(\/|$)/.test(pathname || '');
  }, [pathname]);

  // --- Gesture recognition: touch swipes + mouse drags, one code path ---
  useEffect(() => {
    const EDGE = 28;     // px from the screen edge that counts as an "edge swipe"
    const MIN_DX = 60;   // minimum horizontal travel
    const RATIO = 1.5;   // horizontal must dominate vertical (keeps scrolling safe)
    const MAX_MS = 900;  // slower drags are not swipes
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
      const { x: sx, y: sy, t: st } = start;
      start = null;
      const dx = x - sx;
      const dy = y - sy;
      if (Math.abs(dx) < MIN_DX || Math.abs(dx) < Math.abs(dy) * RATIO || Date.now() - st > MAX_MS) return;

      if (dx > 0) {
        // SWIPE RIGHT
        if (subOpenRef.current) setIsSubNavOpen(false);
        else if (!navOpenRef.current && sx <= EDGE) setIsMobileMenuOpen(true);
      } else {
        // SWIPE LEFT
        if (navOpenRef.current) setIsMobileMenuOpen(false);
        else if (!subOpenRef.current && hasPortalRef.current && sx >= window.innerWidth - EDGE) {
          setIsSubNavOpen(true);
        }
      }
    };

    const onTouchStart = (e: TouchEvent) => begin(e.touches[0].clientX, e.touches[0].clientY, e.target);
    const onTouchEnd = (e: TouchEvent) => finish(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    const onMouseDown = (e: MouseEvent) => { if (e.button === 0) begin(e.clientX, e.clientY, e.target); };
    const onMouseUp = (e: MouseEvent) => {
      if (window.getSelection()?.toString()) { start = null; return; } // user was selecting text
      finish(e.clientX, e.clientY);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsMobileMenuOpen(false); setIsSubNavOpen(false); }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // --- Native Android hardware back button (Capacitor) ---
  // Closes any open menu first; only then navigates back (or exits at the root).
  useEffect(() => {
    let handle: { remove: () => Promise<void> } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const h = await App.addListener('backButton', ({ canGoBack }) => {
          if (subOpenRef.current) { setIsSubNavOpen(false); return; }
          if (navOpenRef.current) { setIsMobileMenuOpen(false); return; }
          if (canGoBack) window.history.back();
          else App.exitApp();
        });
        if (cancelled) h.remove(); else handle = h;
      } catch {
        /* plain browser, or @capacitor/app not installed: nothing to attach */
      }
    })();
    return () => { cancelled = true; handle?.remove(); };
  }, []);

  const handleLogout = () => {
    authSession.clear();
    setIsMobileMenuOpen(false);
    setIsSubNavOpen(false);
    router.replace('/');
  };

  // Sign-in / first-time setup screen: no sidebar, no menus
  if (pathname === '/') {
    return (
      <html lang="en" className="dark">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        </head>
        <body>
          <main className="main-content" style={{ width: '100%' }}>
            {children}
          </main>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <div className="app-container">
          {/* Top strip (title only; the buttons are the pinned FABs below) */}
          <header className="mobile-header">
            <span className="glazy-title" style={{ fontSize: '18px' }}>
              The Blue Fit {session?.userCode ? `• ${session.userCode}` : ''}
            </span>
          </header>

          {/* PINNED TOP-LEFT: hamburger (all screen sizes) */}
          <button
            className={`nav-fab nav-fab-left ${isMobileMenuOpen ? 'active' : ''}`}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => { setIsSubNavOpen(false); setIsMobileMenuOpen(o => !o); }}
          >
            {isMobileMenuOpen ? <X size={24} color="#fff" /> : <Menu size={24} color="#fff" />}
          </button>

          {/* PINNED TOP-RIGHT: portal trigger + fan-out sub-nav */}
          <SubNav
            open={isSubNavOpen}
            setOpen={(v) => { if (v) setIsMobileMenuOpen(false); setIsSubNavOpen(v); }}
          />

          {/* Role-scoped sidebar drawer */}
          <aside className={`main-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-header">
              <div>
                <h2 className="glazy-title" style={{ fontSize: '22px', margin: 0 }}>The Blue Fit</h2>
                {session && (
                  <span className="label-text" style={{ color: 'var(--accent-gold)', display: 'block', marginTop: '4px' }}>
                    {session.name} ({session.userCode})
                  </span>
                )}
              </div>
            </div>

            <nav className="sidebar-nav">
              {/* CLIENT ONLY SEES ATHLETE PORTAL LINKS */}
              {session?.role === 'CLIENT' && (
                <>
                  <Link href="/client" onClick={() => setIsMobileMenuOpen(false)}>My Dashboard</Link>
                  <Link href="/client/diet" onClick={() => setIsMobileMenuOpen(false)}>Diet Planner</Link>
                  <Link href="/client/check-in" onClick={() => setIsMobileMenuOpen(false)}>Daily Check-In</Link>
                  <Link href="/client/messages" onClick={() => setIsMobileMenuOpen(false)}>Messages</Link>
                </>
              )}

              {/* COACH ONLY SEES COACH PORTAL LINKS */}
              {session?.role === 'COACH' && (
                <>
                  <Link href="/coach" onClick={() => setIsMobileMenuOpen(false)}>Coach Overview</Link>
                  <Link href="/coach/clients" onClick={() => setIsMobileMenuOpen(false)}>Client Roster</Link>
                  <Link href="/coach/templates" onClick={() => setIsMobileMenuOpen(false)}>Plan Templates</Link>
                </>
              )}

              {/* MASTER ADMIN SEES ADMIN + OVERSIGHT LINKS */}
              {session?.role === 'ADMIN' && (
                <>
                  <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} style={{ color: 'var(--accent-gold)' }}>
                    Master Admin
                  </Link>
                  <Link href="/admin/onboarding" onClick={() => setIsMobileMenuOpen(false)}>
                    Provision User
                  </Link>
                </>
              )}

              <button
                onClick={handleLogout}
                style={{
                  marginTop: '24px',
                  background: 'rgba(255, 69, 58, 0.1)',
                  border: '1px solid rgba(255, 69, 58, 0.3)',
                  color: '#FF453A',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                <LogOut size={16} /> Sign Out ({session?.userCode})
              </button>
            </nav>
          </aside>

          {/* Blurred backdrop: click to close whichever menu is open */}
          {(isMobileMenuOpen || isSubNavOpen) && (
            <div
              className="mobile-overlay"
              onClick={() => { setIsMobileMenuOpen(false); setIsSubNavOpen(false); }}
            />
          )}

          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
