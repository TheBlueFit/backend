# Blue Fit — Signature Metrics UI Redesign (No AI)

This package keeps the current frontend architecture and existing data/API flows intact while replacing the client health overview's generic concentric O-ring with metric-specific visual progress indicators.

## Visual changes
- Overall Daily Pulse: compact premium score badge with a subtle orbit treatment instead of the three concentric O-rings.
- Movement / Steps: droplet liquid-fill visual.
- Heart Rate: heart outline liquid-fill visual; the displayed BPM remains the actual heart-rate reading. When recovery is available, the fill represents the existing recovery/readiness percentage rather than inventing a heart-rate target.
- Sleep: crescent moon liquid-fill visual.
- Workout: barbell/plates liquid-fill visual.
- Existing recovery focus indicator: converted from the classic circular progress ring to the heart-shaped filler.
- Progress rails: thinner, softer, gradient-accented rails under shape-based metrics.
- Responsive layout: 4-up desktop, 2-up tablet/mobile, 1-up narrow phone.

## Files modified
- `app/client/page.tsx` — passes the existing `heartRate` value to the tracker component.
- `components/client/ClientTrackerDashboard.tsx` — replaces the old concentric rings with Signature Metrics and the Daily Pulse score.
- `components/shared/MetricCard.tsx` — refines the existing progress rail under shape-based cards.
- `components/shared/ShapeFiller.tsx` — gives SVG clip paths unique IDs so multiple filler instances cannot collide.
- `app/globals.css` — adds the Signature Metrics visual system.

## Validation
The modified TSX files were syntax-transpiled with the installed TypeScript compiler and produced no diagnostics.

## Build sequence on the user's project
1. Replace the files above with the versions in this package.
2. Delete `.next`.
3. Run `npm install` only if dependencies changed.
4. Run `npm run build`.
5. Run `npx cap sync android` for Android.
6. Rebuild/install the APK.

## Scope
This redesign intentionally does not change backend APIs, Health Connect permissions, authentication, schedules, admin workflows, or AI image processing.
