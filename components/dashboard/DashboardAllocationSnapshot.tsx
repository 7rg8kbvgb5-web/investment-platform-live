import Link from 'next/link';
import AllocationPieChart from '../AllocationPieChart';
import type { AssetAllocationSlice } from '../../lib/engines/dashboard-summary';

export function DashboardAllocationSnapshot({ allocation }: { allocation: AssetAllocationSlice[] }) {
  if (allocation.length === 0) return null;

  return (
    <Link href="/portfolios?tab=riskProfile" style={link}>
      <div style={box}>
        <p style={eyebrow}>Model Portfolio · Balanced profile</p>
        <h3 style={title}>Asset allocation snapshot</h3>
        <div style={chartWrap}>
          <AllocationPieChart
            allocations={allocation.map((a) => ({ asset_class: a.assetClass, target_weight: a.weight }))}
          />
        </div>
      </div>
    </Link>
  );
}

const link = {
  textDecoration: 'none',
  color: 'inherit',
  display: 'block',
};

const box = {
  padding: '18px 20px',
  borderRadius: '14px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  marginBottom: '18px',
  cursor: 'pointer',
};

const eyebrow = {
  margin: 0,
  fontSize: '11px',
  fontWeight: 700,
  color: '#8fb7e8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const title = {
  margin: '4px 0 4px',
  fontSize: '15px',
  fontWeight: 700,
  color: '#e2e8f0',
};

const chartWrap = {
  marginTop: '4px',
};
