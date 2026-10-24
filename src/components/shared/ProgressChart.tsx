'use client';
import React, { useId } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

type DataPoint = { date: string; [key: string]: string | number | null };

interface ProgressChartProps {
  data: DataPoint[];
  dataKey: string;
  /** Any CSS colour, including var(--token) — the chart follows the light/dark theme. */
  color?: string;
  unit?: string;
  label?: string;
  variant?: 'area' | 'bar';
  height?: number;
  /** Draws a dashed goal line. */
  goal?: number;
  /** Start the axis at zero (use for steps, water, sleep). */
  zeroBased?: boolean;
}

export default function ProgressChart({
  data, dataKey, color = 'var(--accent-gold)', unit = '', label, variant = 'area', height = 240, goal, zeroBased,
}: ProgressChartProps) {
  const gid = useId().replace(/:/g, '');
  const name = label || dataKey.charAt(0).toUpperCase() + dataKey.slice(1);
  const axis = { fontSize: 11, fill: 'var(--text-secondary)' } as const;
  const domain: [any, any] = zeroBased ? [0, (max: number) => Math.ceil(Math.max(max, goal ?? 0) * 1.1)] : ['dataMin - 1', 'dataMax + 1'];

  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axis} dy={8} interval="preserveStartEnd" minTickGap={16} />
      <YAxis axisLine={false} tickLine={false} tick={axis} domain={domain} width={44} />
      <Tooltip
        cursor={{ stroke: 'var(--border-focus)' }}
        contentStyle={{ borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-elev)', color: 'var(--text-primary)', boxShadow: '0 8px 24px rgb(var(--well-rgb) / 0.4)', fontSize: 12 }}
        labelStyle={{ color: 'var(--text-secondary)' }}
        itemStyle={{ color: 'var(--text-primary)' }}
        formatter={(value: any) => [`${Number(value).toLocaleString()}${unit ? ` ${unit}` : ''}`, name]}
      />
      {goal != null && <ReferenceLine y={goal} stroke="var(--text-secondary)" strokeDasharray="5 4" />}
    </>
  );

  return (
    <div style={{ width: '100%', height, marginTop: 12 }}>
      <ResponsiveContainer width="100%" height="100%">
        {variant === 'bar' ? (
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            {common}
            <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={`g-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            {common}
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#g-${gid})`} connectNulls dot={{ r: 2.5, fill: color, strokeWidth: 0 }} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
