Blue Fit local verification fix

Files changed:
- app/client/schedules/view/page.tsx — fixes the assignmentId effect race that produced “No schedule was selected” even when the URL contained assignmentId.
- app/layout.tsx — makes iframe detection hydration-safe and always renders /client/schedules/view as a bare route without the global permissions gate/navigation.
- app/globals.css — restores the missing health-overview/ring-caption styles so Movement, Sleep and Training remain separated.

AI image import was not added.

After replacement:
1. rmdir /s /q .next
2. npm run build
3. npx cap sync android (only if rebuilding the APK)
4. Rebuild/install the APK if testing on Android.
