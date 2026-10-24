/**
 * Standalone layout for the schedule viewer page.
 * This route is loaded inside an iframe from ClientScheduleViewer.
 * By providing its own layout here, it completely bypasses the root
 * layout (auth guard, hamburger nav, MobilePermissionsGate) so the
 * iframe never gets redirected to the login page.
 */
export default function ScheduleViewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          :root {
            --accent-gold: var(--accent-gold); --accent-green: var(--accent-green);
            --text-primary: #FFFFFF; --text-secondary: #888888;
            --bg-app: var(--s1);
          }
          body { background: var(--bg-elev); color: var(--text-primary); font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif; -webkit-font-smoothing: antialiased; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .animate-spin { animation: spin 1s linear infinite; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
