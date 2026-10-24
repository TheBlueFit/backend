# The Blue Fit — production-hardening release

## Your 8 points
1. **Template import (coach)** – `POST /coach/{id}/templates/import` + new Import dialog (upload .json files or paste JSON, per-template validation, pick which to import, sample download). Single object, list, or `{templates:[…]}` all accepted. Sample: `backend/tools/example_templates.json`.
2. **Login on every instance** – sessions persist (30-day token, silently refreshed daily via `/auth/refresh`), so you sign in once per device, not once per visit. Sign out calls `/auth/logout` and clears the session. Expired/invalid tokens bounce to the login screen, then back to the page you wanted.
3. **Messaging** – rebuilt end to end: conversation list with unread badges, optimistic send, retry on failure, "Seen" receipts, day separators, ~4 s polling while the tab is visible. Works the same for coach and client.
4. **Monitor accuracy** – presence now comes from a real heartbeat (`/presence/ping`) and logout; signed-out users no longer show as online. Counts (online / active today / inactive / never signed in / no coach) are computed server-side from the same data.
5. **Consistent UI** – your original dark glass design is kept exactly (header, gold/green headings, pulse ring, ShapeFiller cards, pop-nav). Every screen now uses the same colour tokens, so all roles look identical in style; inputs are 16 px on phones (no iOS zoom).
6. **Coach progress analytics** – steps (latest, 7-day avg, 14-day chart), sleep, water, workouts, plus the client's profile (age, height, start weight, goal, activity level, medical notes). Coach dashboard has a per-client steps table.
7. **CORS** – `https://bluefit-1g5.pages.dev`, `http://localhost:3000/4173/8080`, `capacitor://localhost` and `https://localhost` are allowed by default (`ALLOWED_ORIGINS` in `template.yaml`).
8. **Dark / light toggle** – round button in the header; dark is the default (your original look), light uses the same layout. Remembers the choice, no flash on load.

## Things you should know
- **Steps on iPhone**: a Safari home-screen web app cannot read Apple Health. I added a manual *Daily log* card (steps / sleep / water) on the client home; coaches see it immediately. Native Capacitor builds still use the Health plugin when present.
- Chat is polling-based (not websockets) – simple and reliable on Lambda.
- The admin dashboard's made-up numbers (840 diets, 99.9% health, retention) were replaced with live counts (Clients, Online now, and a Platform Analytics tab driven by the Monitor data).
- iOS status bar stays black-translucent; the app UI is unchanged from your original.
- Service worker no longer serves stale pages after a deploy.

## Deploy
Backend: `cd backend && sam build && sam deploy`
Frontend: set `NEXT_PUBLIC_API_URL` to your API URL, then `npm run build` (static export to `out/`) and publish to Cloudflare Pages. Your project still needs `@capgo/capacitor-health` installed, as before.
Tests: `python tests/run_tests.py` (71), `python tests/test_new_features.py` (51), `python tests/test_v2_features.py` (81) — all passing.

## Verified end-to-end (real backend + browser)
Login/persistence, theme toggle, daily log → coach steps, two-way chat with unread/seen, template import, coach dashboard/roster/progress, admin dashboard/monitor (client shows "Signed out" after logout), no horizontal overflow or console errors on any page at phone width, both themes.

## Exercise library & sample templates (new)
- **Coach → Plan Templates → START FROM A SAMPLE**: 9 ready-made templates across Strength, Cardio, HIIT and Maintenance. "Use this" creates a real template and opens it in the editor.
- **Template editor → ADD FROM LIBRARY**: 186 exercise variations in 4 categories (search or browse by movement, e.g. Bench Press → Incline Dumbbell Press, Push-up…). Tap several, add them in that order, with sensible default sets/reps/rest per category.
- **Ordering**: every exercise has up/down arrows and a duplicate button; everything stays editable (sets, reps, rest, tempo, weight, RPE, notes). "Blank" still adds an empty row.
- Frontend only: no backend change or redeploy needed. The library lives in `src/lib/exerciseLibrary.ts`; add your own exercises by editing that file.

## Appearance: colour themes, vibrancy and motion (new)
- **Where**: ☰ menu → **Appearance** (and a palette button on the sign-in page). Changes apply live and are remembered on that device, applied before the first paint so there's no flash.
- **Theme**: Dark / Light (the header toggle still works as a quick switch).
- **Colour**: 7 palettes (Classic = your original gold/green, Ocean, Violet, Rose, Ember, Mint, Graphite). Every screen follows the choice because the whole UI reads the same accent tokens. Light theme automatically uses deeper shades so text stays readable.
- **Vibrancy slider**: Muted ↔ Vivid. Lowering it fades saturation (and, on black, brightness) for a calmer, more elegant look. 100 = exactly the original colours.
- **Animations** (on/off): soft rise-in of screens and cards, gentle hover/press feedback, a slow ambient colour glow in the palette colours. Defaults to off for people who have "Reduce motion" enabled on their phone.
- **Reset to original look** restores Classic, full vibrancy.
- Frontend only: no backend change. Palettes live in `src/lib/look.ts`; motion CSS is at the end of `globals.css`.

## Styles + live time-of-day scenery (new)
- **Appearance → Style**: Original (unchanged), Glass (frosted translucent panels over soft colour glow), Vintage (warm paper texture, serif type), Old Gym (concrete texture, chalk-white type, hazard-stripe header, hard-edged cards), Modern Gym (sharp, high-contrast, condensed uppercase headings). Each has its own dark and light version. Choosing a style also picks the colours it is designed with (Sepia, Ember, Volt, Classic); change the colour afterwards if you prefer.
- **Appearance → Background scenery** (Auto / Night / Morning / Afternoon / Evening / Off). Auto follows the phone's clock:
  - Night (8 pm–5 am): twinkling stars, crescent moon, occasional shooting star.
  - Morning (5–11 am): sunrise glow, fresh-air breeze streaks and drifting leaves, birds that fly in, land on a branch, hop and look around, then fly off.
  - Afternoon (11 am–5 pm): bright sun with slow rays, drifting clouds, butterflies and floating pollen.
  - Evening (5–8 pm): sunset horizon glow, fireflies, an occasional flock of birds crossing.
- The scenery is drawn live (no GIF/video files), so it is tiny, follows dark/light and the chosen colours, runs at ~30 fps, pauses when the app is in the background, and shows a still frame when Animations is off or "Reduce motion" is on.
- New fonts (Playfair Display, Lora, Oswald, Barlow, Barlow Condensed) are loaded from Google Fonts like Outfit; the app falls back gracefully offline.
- Frontend only: no backend change.
