# Changes in this version

## Photos open inside the app
- `MediaViewerModal` now shows the photo in a sandboxed **iframe popup** (zoom, rotate, reset). No S3 link is ever opened in a browser tab.
- Root cause fixed in the backend: the 3-day status response never included `objectKey`, so the old code fell back to `window.open(viewUrl)`.
- Coaches can now open their assigned clients' photos (previously `/media/view` only allowed `coaches/<own id>/`).

## Animated fillers (`ShapeFiller`)
Footsteps, water drop (waves + bubbles), beating heart with ECG, moon with stars and "z"s, barbell doing a rep, flame, people, bolt.
Fill level follows the real value; animations stop for "reduce motion". Coach cards now use fillers too.

## Admin → Monitor (`/admin/monitor`)
New nav item + button on the admin dashboard. Online now / active today / inactive / never signed in, per-user last seen, login count,
last check-in, workouts this week, coach assignment, locked/pending flags, and a recent-activity feed. Auto-refreshes every 30 s.

## Routing / wiring fixes
- **Progress Review** (`/coach/clients/details/progress?id=`): was hard-coded demo data with a dead link; now real check-ins, charts and photos.
- **Weekly check-in photos** were posted to the 3-day endpoint with `day: 0` and always rejected; now use `/athlete/checkin/photos/*`.
- **Today's workout**: assigned plans now appear for their scheduled weekdays, can be marked done/undone, and feed Workout %, Consistency.
- Coach assign / schedules checks accepted only full-key `coachId`; now accept bare ids too.
- Coach client page lists assigned plans.
- Template `referenceImageKey` must live in the coach's own folder (it could previously point at any client's photo).
