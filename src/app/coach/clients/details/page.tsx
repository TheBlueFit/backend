"use client";
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { dashboardAPI, CoachClient } from '@/services/api';

// 1. Child component that uses the search params (?id=...)
function ClientDetailsContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('id');
  const [client, setClient] = useState<CoachClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await dashboardAPI.getCoachClients();
        setClient(data.clients.find((c) => c.id === clientId) ?? null);
      } catch (error) {
        console.error('Failed to fetch client:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [clientId]);

  const tile = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div className="app-card fade-in">

        <Link href="/coach/clients" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px', marginBottom: '20px' }}>
          <ArrowLeft size={16} /> Client Roster
        </Link>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading client profile...</div>
        ) : !client ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No athlete found for ID: {clientId ?? '—'}</div>
        ) : (
          <>
            <div className="section-header" style={{ marginBottom: '24px' }}>
              <div>
                <h2 className="animated-gradient-text" style={{ fontSize: '28px', textTransform: 'none', marginBottom: '8px' }}>{client.name}</h2>
                <span className="label-text" style={{ color: 'var(--text-secondary)', textTransform: 'none' }}>Athlete profile • ID {client.id}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <div style={tile}>
                <span className="label-text" style={{ fontSize: '11px' }}>Goal</span>
                <span style={{ fontSize: '18px', fontWeight: 600 }}>{client.goal}</span>
              </div>
              <div style={tile}>
                <span className="label-text" style={{ fontSize: '11px' }}>Adherence</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: client.adherence >= 80 ? 'var(--accent-green)' : 'var(--accent-gold)' }}>{client.adherence}%</span>
              </div>
              <div style={tile}>
                <span className="label-text" style={{ fontSize: '11px' }}>Last check-in</span>
                <span style={{ fontSize: '18px', fontWeight: 600 }}>{client.lastCheckIn}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <Link
                href={`/coach/clients/details/progress?id=${client.id}`}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
              >
                <TrendingUp size={16} /> VIEW PROGRESS ANALYTICS
              </Link>

              <Link
                href={`/coach/clients/check-status?clientId=${encodeURIComponent(client.id)}`}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
              >
                VIEW CHECK STATUS
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// 2. Wrap the child component with Suspense in the default export
export default function ClientDetailsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', color: 'white' }}>Loading client profile...</div>}>
      <ClientDetailsContent />
    </Suspense>
  );
}
