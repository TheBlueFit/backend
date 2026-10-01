"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { dashboardAPI, CoachClient } from '@/services/api';

export default function CoachClientRoster() {
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await dashboardAPI.getCoachClients('coach-123');
        setClients(data.clients);
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClients();
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
              <Link
                key={c.id}
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
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
