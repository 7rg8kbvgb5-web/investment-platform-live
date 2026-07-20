'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import type { HoldingRiskProfile } from '../lib/engines/portfolio-analytics';

export default function SharpeRankingChart({ holdings }: { holdings: HoldingRiskProfile[] }) {
  const sorted = [...holdings].sort((a, b) => b.sharpeRatio - a.sharpeRatio);

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, sorted.length * 32)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
        <CartesianGrid stroke="#1e3a5f" horizontal={false} />
        <XAxis type="number" stroke="#94a3b8" tickFormatter={(v) => v.toFixed(1)} />
        <YAxis type="category" dataKey="code" stroke="#94a3b8" width={70} />
        <Tooltip
          cursor={{ fill: 'rgba(147, 197, 253, 0.08)' }}
          content={({ payload }) => {
            if (!payload || payload.length === 0) return null;
            const point = payload[0].payload as HoldingRiskProfile;
            return (
              <div style={{ background: '#0b2342', border: '1px solid #2d4a6b', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}>
                <strong>{point.code}</strong> — {point.name}
                <div style={{ color: '#94a3b8', marginTop: '4px' }}>
                  Sharpe {point.sharpeRatio.toFixed(2)} · {point.assetClass}
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="sharpeRatio">
          {sorted.map((h) => (
            <Cell key={h.code} fill={h.sharpeRatio >= 0 ? '#86efac' : '#fca5a5'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
