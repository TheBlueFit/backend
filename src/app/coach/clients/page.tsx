"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, CheckCircle2, AlertCircle, Footprints, MessageSquare } from 'lucide-react';
import { PresenceBadge } from '@/components/shared/Presence';
import { fmtNum } from '@/lib/format';
import { GlassCard } from '@/components/GlassCard';
import { dashboardAPI, CoachClient } from '@/services/api';

export default function CoachClientRoster() {
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await dashboardAPI.getCoachClients();
        setClients(data.clients);
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClients();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') fetchClients(); }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const q = query.trim().toLowerCase();
  const visible = clients.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.goal.toLowerCase().includes(q)
  );

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div className="app-card fade-in">

        <div className="section-header" style={{ justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 className="animated-gradient-text" style={{ fontSize: '28px', textTransform: 'none', marginBottom: '8px' }}>Client Roster</h2>
            <span className="label-text" style={{ color: 'var(--text-secondary)', textTransform: 'none' }}>
              {isLoading ? 'Loading athletes...' : `${clients.length} athletes assigned to you.`}
            </span>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or goal"
            aria-label="Search clients"
            style={{
              width: '100%',
              padding: '14px 14px 14px 40px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '15px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Roster...</div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No athletes match "{query}".</div>
        ) : (
          <div className="plan-cards-container">
            {visible.map((c) => (
              <div key={c.id}>
                <Link
                  href={`/coach/clients/details?id=${c.id}`}
                  style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                >
                  <GlassCard
                    title={c.name}
                    subtitle={`${c.goal} • ${c.adherence}% adherence • Check-in: ${c.lastCheckIn}`}
                    statusText={c.status === 'on-track' ? 'on track' : 'needs attention'}
                    statusColor={c.status === 'on-track' ? 'green' : 'red'}
                    Icon={c.status === 'on-track' ? CheckCircle2 : AlertCircle}
                  />
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 4px 0' }}>
                  <PresenceBadge presence={c.presence} lastSeenAt={c.lastSeenAt} />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <Footprints size={13} /> {c.stepsToday != null ? `${fmtNum(c.stepsToday)} steps` : 'No steps yet'}
                  </span>
                  <Link href={`/coach/messages?client=${encodeURIComponent(c.id)}`} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--accent-gold)', textDecoration: 'none' }}>
                    <MessageSquare size={14} /> Message
                    {!!c.unreadMessages && <span className="msg-badge" style={{ margin: 0 }}>{c.unreadMessages}</span>}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
