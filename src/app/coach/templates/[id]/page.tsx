import { Suspense } from 'react';
import TemplateClient from './TemplateClient';

// Pre-generate common template IDs for static export
export function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' },
    { id: 'default' },
  ];
}

export default function TemplateConfigurationPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', color: 'white' }}>Loading configuration...</div>}>
      <TemplateClient />
    </Suspense>
  );
}