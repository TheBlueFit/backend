"use client";
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Dumbbell, TrendingUp } from 'lucide-react';
import { dashboardAPI, CoachClient } from '@/services/api';

// 1. Child component that uses the search params (?id=...)
function ClientDetailsContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('id');
  const [client, setClient] = useState<CoachClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    dashboardAPI
      .getClientSchedules(clientId)
      .then((res) => { if (!cancelled) setSchedules(res.schedules || []); })
      .catch(() => { if (!cancelled) setSchedules([]); });
    return () => { cancelled = true; };
  }, [clientId]);

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

            <div style={{ marginTop: '28px' }}>
              <div className="label-text" style={{ fontSize: '11px', marginBottom: '10px', color: 'var(--text-secondary)' }}>ASSIGNED WORKOUT PLANS</div>
              {schedules.length === 0 ? (
                <div style={{ padding: '18px', borderRadius: '12px', background: 'rgba(255,255,255,0.025)', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  <span>No plan assigned yet.</span>
                  <Link href="/coach/templates" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '12px' }}>Open templates to assign one</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {schedules.map((sch) => (
                    <div key={sch.assignmentId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(96,165,250,0.09)', color: '#60A5FA', flexShrink: 0 }}><Dumbbell size={16} /></span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '14px', fontWeight: 700 }}>{sch.templateTitle || 'Workout plan'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          <CalendarDays size={12} /> Starts {sch.startDate}{sch.workoutDays ? ` · ${sch.workoutDays}` : ''}{sch.exercises?.length ? ` · ${sch.exercises.length} exercises` : ''}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
