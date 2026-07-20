'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, Cell } from 'recharts';
import type { AssetClassComparisonRow } from '../lib/engines/portfolio-review-comparison';

const STATUS_COLOR: Record<string, string> = {
  'in-line': '#4ade80',
  overweight: '#facc15',
  underweight: '#60a5fa',
};

export default function AssetClassComparisonChart({ rows }: { rows: AssetClassComparisonRow[] }) {
  const data = rows.map((row) => ({
    ...row,
    label: row.assetClass.replace(' / ', '/\n'),
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 40, bottom: 10, left: 10 }}>
        <CartesianGrid stroke="#1e3a5f" horizontal={false} />
        <XAxis type="number" stroke="#94a3b8" unit="%" />
        <YAxis type="category" dataKey="assetClass" stroke="#94a3b8" width={150} tick={{ fontSize: 11 }} />
        <Tooltip
          cursor={{ fill: 'rgba(147, 197, 253, 0.06)' }}
          content={({ payload }) => {
            if (!payload || payload.length === 0) return null;
            const row = payload[0].payload as AssetClassComparisonRow;
            return (
              <div style={{ background: '#0b2342', border: '1px solid #2d4a6b', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}>
                <strong>{row.assetClass}</strong>
                <div style={{ color: '#94a3b8', marginTop: '4px' }}>
                  Client {row.clientWeight}% · Model {row.modelWeight}% · {row.difference > 0 ? '+' : ''}
                  {row.difference}pp
                </div>
              </div>
            );
          }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="modelWeight" name="Model target" fill="#2d4a6b" barSize={10} />
        <Bar dataKey="clientWeight" name="Client actual" barSize={10}>
          {data.map((row) => (
            <Cell key={row.assetClass} fill={STATUS_COLOR[row.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
