import React from 'react';

// Static sidebar, top bar and bottom tab bar removed: navigation is now handled
// globally by src/app/layout.tsx (left drawer) and src/components/shared/SubNav.tsx
// (top-right Athlete Tools). Mirrors coach/layout.tsx.
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
