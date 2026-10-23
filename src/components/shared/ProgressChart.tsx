'use client';
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

type DataPoint = { date: string; [key: string]: string | number };

interface ProgressChartProps {
  data: DataPoint[];
  dataKey: string;
  color?: string;
  unit?: string;
}

export default function ProgressChart({ data, dataKey, color = 'var(--accent-gold, #E5B869)', unit = '' }: ProgressChartProps) {
  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.07)" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary, #94a3b8)' }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary, #94a3b8)' }} domain={['dataMin - 1', 'dataMax + 1']} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(18,18,26,0.96)', color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
            formatter={(value: any) => [`${value} ${unit}`, dataKey.charAt(0).toUpperCase() + dataKey.slice(1)]}
          />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} fillOpacity={1} fill={`url(#gradient-${dataKey})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}