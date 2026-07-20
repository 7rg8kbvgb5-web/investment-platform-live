'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { HoldingRiskProfile } from '../lib/engines/portfolio-analytics';

const COLORS: Record<string, string> = {
  'Australian Equities': '#93c5fd',
  'International Equities': '#86efac',
  'Listed Property / Infrastructure': '#fde68a',
  Alternatives: '#fdba74',
  'Australian Fixed Interest': '#c4b5fd',
  'Global Fixed Interest': '#f9a8d4',
  Cash: '#67e8f9',
};

export default function RiskReturnScatterChart({ holdings }: { holdings: HoldingRiskProfile[] }) {
  const assetClasses = Array.from(new Set(holdings.map((h) => h.assetClass)));

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid stroke="#1e3a5f" />
        <XAxis
          type="number"
          dataKey="annualizedVolatility"
          name="Volatility"
          unit="%"
          tickFormatter={(v) => (v * 100).toFixed(0)}
          stroke="#94a3b8"
          label={{ value: 'Annualised Volatility', position: 'insideBottom', offset: -10, fill: '#94a3b8' }}
        />
        <YAxis
          type="number"
          dataKey="annualizedReturn"
          name="Return"
          unit="%"
          tickFormatter={(v) => (v * 100).toFixed(0)}
          stroke="#94a3b8"
          label={{ value: 'Annualised Return', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
        />
        <ZAxis range={[80, 80]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{ background: '#0b2342', border: '1px solid #2d4a6b', fontSize: '12px' }}
          content={({ payload }) => {
            if (!payload || payload.length === 0) return null;
            const point = payload[0].payload as HoldingRiskProfile;
            return (
              <div style={{ background: '#0b2342', border: '1px solid #2d4a6b', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}>
                <strong>{point.code}</strong> — {point.name}
                <div style={{ color: '#94a3b8', marginTop: '4px' }}>
                  Return {(point.annualizedReturn * 100).toFixed(1)}% · Volatility {(point.annualizedVolatility * 100).toFixed(1)}% · Sharpe {point.sharpeRatio.toFixed(2)}
                </div>
              </div>
            );
          }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {assetClasses.map((assetClass) => (
          <Scatter
            key={assetClass}
            name={assetClass}
            data={holdings.filter((h) => h.assetClass === assetClass)}
            fill={COLORS[assetClass] ?? '#93c5fd'}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
