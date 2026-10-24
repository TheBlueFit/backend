"use client";
import { Suspense } from 'react';
import TemplateClient from '../[id]/TemplateClient';

// Template IDs are created by the server (tpl_xxxxxxxx), so they cannot be pre-built for a static
// export. This route reads the ID from the URL query (?id=...) in the browser instead.
export default function EditTemplatePage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-primary)' }}>Loading configuration...</div>}>
      <TemplateClient />
    </Suspense>
  );
}
