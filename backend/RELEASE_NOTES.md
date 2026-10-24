# The Blue Fit — production-hardening release

## Your 8 points
1. **Template import (coach)** – `POST /coach/{id}/templates/import` + new Import dialog (upload .json files or paste JSON, per-template validation, pick which to import, sample download). Single object, list, or `{templates:[…]}` all accepted. Sample: `backend/tools/example_templates.json`.
2. **Login on every instance** – sessions persist (30-day token, silently refreshed daily via `/auth/refresh`), so you sign in once per device, not once per visit. Sign out calls `/auth/logout` and clears the session. Expired/invalid tokens bounce to the login screen, then back to the page you wanted.
3. **Messaging** – rebuilt end to end: conversation list with unread badges, optimistic send, retry on failure, "Seen" receipts, day separators, ~4 s polling while the tab is visible. Works the same for coach and client.
4. **Monitor accuracy** – presence now comes from a real heartbeat (`/presence/ping`) and logout; signed-out users no longer show as online. Counts (online / active today / inactive / never signed in / no coach) are computed server-side from the same data.
5. **Consistent UI** – one design-token system and one component kit across login, client, coach and admin. Same buttons, cards, inputs, badges, tables, empty states, skeletons. Sidebar on desktop, top bar + bottom tab bar on phones, safe-area aware, 16 px inputs (no iOS zoom).
6. **Coach progress analytics** – steps (latest, 7-day avg, 14-day chart), sleep, water, workouts, plus the client's profile (age, height, start weight, goal, activity level, medical notes). Coach dashboard has a per-client steps table.
7. **CORS** – `https://bluefit-1g5.pages.dev`, `http://localhost:3000/4173/8080`, `capacitor://localhost` and `https://localhost` are allowed by default (`ALLOWED_ORIGINS` in `template.yaml`).
8. **Dark / light toggle** – in the top bar (phones), sidebar (desktop) and login screen. Remembers the choice, follows the system on first visit, no flash on load.

## Things you should know
- **Steps on iPhone**: a Safari home-screen web app cannot read Apple Health. I added a manual *Daily log* card (steps / sleep / water) on the client home; coaches see it immediately. Native Capacitor builds still use the Health plugin when present.
- Chat is polling-based (not websockets) – simple and reliable on Lambda.
- The admin "Core Services" and "Monthly Analysis" tabs showed made-up numbers, so they were removed. The animated ShapeFiller dashboards were replaced by the shared kit.
- iOS status bar style is now `default` and the theme follows the system by default.
- Service worker no longer serves stale pages after a deploy.

## Deploy
Backend: `cd backend && sam build && sam deploy`
Frontend: set `NEXT_PUBLIC_API_URL` to your API URL, then `npm run build` (static export to `out/`) and publish to Cloudflare Pages. Your project still needs `@capgo/capacitor-health` installed, as before.
Tests: `python tests/run_tests.py` (71), `python tests/test_new_features.py` (51), `python tests/test_v2_features.py` (81) — all passing.

## Verified end-to-end (real backend + browser)
Login/persistence, theme toggle, daily log → coach steps, two-way chat with unread/seen, template import, coach dashboard/roster/progress, admin dashboard/monitor (client shows "Signed out" after logout), no horizontal overflow or console errors on any page at phone width, both themes.
