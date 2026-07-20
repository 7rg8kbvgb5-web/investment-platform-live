'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import type { HoldingRecommendation } from '../lib/engines/portfolio-review-comparison';

const ACTION_COLOR: Record<string, string> = {
  buy: '#4ade80',
  increase: '#4ade80',
  reduce: '#facc15',
  sell: '#f87171',
  hold: '#94a3b8',
};

export default function HoldingAdjustmentChart({ recommendations }: { recommendations: HoldingRecommendation[] }) {
  const data = recommendations.filter((r) => r.action !== 'hold');

  if (data.length === 0) {
    return <p style={{ fontSize: '13px', color: '#94a3b8' }}>No weight changes recommended.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 40, bottom: 10, left: 10 }}>
        <CartesianGrid stroke="#1e3a5f" horizontal={false} />
        <XAxis type="number" stroke="#94a3b8" unit="pp" />
        <YAxis type="category" dataKey="code" stroke="#94a3b8" width={70} />
        <ReferenceLine x={0} stroke="#2d4a6b" />
        <Tooltip
          cursor={{ fill: 'rgba(147, 197, 253, 0.06)' }}
          content={({ payload }) => {
            if (!payload || payload.length === 0) return null;
            const row = payload[0].payload as HoldingRecommendation;
            return (
              <div style={{ background: '#0b2342', border: '1px solid #2d4a6b', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', maxWidth: '260px' }}>
                <strong>{row.code}</strong> — {row.name}
                <div style={{ color: '#94a3b8', margin: '4px 0' }}>
                  {row.action.toUpperCase()} · {row.currentWeight}% → {row.targetWeight}% ({row.changeWeight > 0 ? '+' : ''}
                  {row.changeWeight}pp)
                </div>
                <div style={{ color: '#cbd5e1' }}>{row.rationale}</div>
              </div>
            );
          }}
        />
        <Bar dataKey="changeWeight">
          {data.map((row) => (
            <Cell key={row.code} fill={ACTION_COLOR[row.action]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
