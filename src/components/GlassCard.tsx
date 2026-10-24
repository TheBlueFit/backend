import React from 'react';
import { LucideIcon } from 'lucide-react';

interface GlassCardProps {
  title: string;
  subtitle: string;
  statusText?: string;
  statusColor?: 'green' | 'red' | 'gold';
  Icon?: LucideIcon;
}

export function GlassCard({ title, subtitle, statusText, statusColor = 'green', Icon }: GlassCardProps) {
  const getStatusStyles = () => {
    switch (statusColor) {
      case 'green': return { color: 'var(--accent-green)', bg: 'rgb(var(--green-rgb) / 0.1)', border: 'rgb(var(--green-rgb) / 0.3)' };
      case 'red': return { color: 'var(--danger)', bg: 'rgb(var(--red-rgb) / 0.1)', border: 'rgb(var(--red-rgb) / 0.3)' };
      case 'gold': return { color: 'var(--accent-gold)', bg: 'rgb(var(--gold-rgb) / 0.1)', border: 'rgb(var(--gold-rgb) / 0.3)' };
    }
  };

  const statusStyle = getStatusStyles();

  return (
    <div className="plan-card fade-in">
      <div className="plan-card-left">
        <span className="plan-item-name">{title}</span>
        <span className="plan-item-category">{subtitle}</span>
      </div>
      <div className="plan-card-right" style={{ alignItems: 'flex-end', gap: '6px' }}>
        {Icon && <Icon size={24} color={statusStyle.color} />}
        {statusText && (
          <span style={{ 
            fontSize: '10px', 
            fontWeight: '800', 
            color: statusStyle.color, 
            letterSpacing: '1px',
            background: statusStyle.bg,
            padding: '4px 8px',
            borderRadius: '4px',
            border: `1px solid ${statusStyle.border}`
          }}>
            {statusText.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}