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
      case 'green': return { color: '#00E27B', bg: 'rgba(0, 226, 123, 0.1)', border: 'rgba(0, 226, 123, 0.3)' };
      case 'red': return { color: '#FF453A', bg: 'rgba(255, 69, 58, 0.1)', border: 'rgba(255, 69, 58, 0.3)' };
      case 'gold': return { color: '#E5B869', bg: 'rgba(229, 184, 105, 0.1)', border: 'rgba(229, 184, 105, 0.3)' };
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