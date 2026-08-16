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
} from 'recharts';
import type { AssetClassRiskReturn } from '../lib/engines/portfolio-analytics';

const COLORS: Record<string, string> = {
  'Australian Equities': '#93c5fd',
  'International Equities': '#86efac',
  'Listed Property / Infrastructure': '#fde68a',
  Alternatives: '#fdba74',
  'Australian Fixed Interest': '#c4b5fd',
  'Global Fixed Interest': '#f9a8d4',
  Cash: '#67e8f9',
};

// Same chart as Risk vs. Return by Holding, one level up: each point is
// an asset class's combined risk/return profile, as actually achieved
// by the weighted mix of its underlying securities (not a simple
// average of their individual stats).

export default function AssetClassRiskReturnScatterChart({
  assetClasses,
}: {
  assetClasses: AssetClassRiskReturn[];
}) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 30, right: 20, bottom: 40, left: 10 }}>
        <CartesianGrid stroke="#1e3a5f" />
        <XAxis
          type="number"
          dataKey="annualizedVolatility"
          name="Volatility"
          unit="%"
          tickFormatter={(v) => (v * 100).toFixed(0)}
          stroke="#94a3b8"
          label={{ value: 'Annualised Volatility', position: 'insideBottom', offset: -25, fill: '#94a3b8' }}
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
        <ZAxis range={[140, 140]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={({ payload }) => {
            if (!payload || payload.length === 0) return null;
            const point = payload[0].payload as AssetClassRiskReturn;
            return (
              <div
                style={{
                  background: '#0b2342',
                  border: '1px solid #2d4a6b',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              >
                <strong>{point.assetClass}</strong>
                <div style={{ color: '#94a3b8', marginTop: '4px' }}>
                  Return {(point.annualizedReturn * 100).toFixed(1)}% · Volatility{' '}
                  {(point.annualizedVolatility * 100).toFixed(1)}% · Sharpe {point.sharpeRatio.toFixed(2)}
                </div>
              </div>
            );
          }}
        />
        <Scatter
          data={assetClasses}
          fill="#93c5fd"
          shape={(props: { cx?: number; cy?: number; payload?: AssetClassRiskReturn }) => {
            const { cx, cy, payload } = props;
            if (cx === undefined || cy === undefined || !payload) return <g />;
            const color = COLORS[payload.assetClass] ?? '#93c5fd';
            return (
              <g>
                <circle cx={cx} cy={cy} r={9} fill={color} stroke="#0b2342" strokeWidth={1.5} />
                <text x={cx} y={cy - 14} textAnchor="middle" fontSize={11} fill="#e2e8f0">
                  {payload.assetClass}
                </text>
              </g>
            );
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
