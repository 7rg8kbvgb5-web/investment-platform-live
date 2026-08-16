'use client';

import type { ReactNode } from 'react';

// One shared visual pattern for "a holding's key stats", used on Model
// Portfolio, Risk Profile, and Construction so the same kind of
// information reads the same way wherever it appears - a full-width
// responsive grid of labelled cells, each with a large, legible value
// (or an input) rather than small inline text bunched to one side.

export function HoldingMetricGrid({ children }: { children: ReactNode }) {
  return <div style={grid}>{children}</div>;
}

type HoldingMetricCellProps = {
  label: string;
  children: ReactNode;
  /** Tints the cell to draw the eye - use for a conviction/house-view read, an override, or a notable change. */
  tone?: 'default' | 'positive' | 'negative' | 'accent';
};

export function HoldingMetricCell({ label, children, tone = 'default' }: HoldingMetricCellProps) {
  return (
    <div style={{ ...cell, ...toneStyles[tone] }}>
      <span style={cellLabel}>{label}</span>
      <div style={cellValue}>{children}</div>
    </div>
  );
}

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '8px',
  width: '100%',
  marginTop: '6px',
};

const cell = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '2px',
  padding: '6px 10px',
  borderRadius: '8px',
  background: '#0b2342',
  border: '1px solid #1e3a5f',
  minWidth: 0,
};

const toneStyles: Record<string, object> = {
  default: {},
  positive: { background: '#0f3d2e', border: '1px solid #10b981' },
  negative: { background: '#4a1520', border: '1px solid #ef4444' },
  accent: { background: '#0b2447', border: '1px solid #60a5fa' },
};

const cellLabel = {
  fontSize: '10px',
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const cellValue = {
  fontSize: '15px',
  fontWeight: 700,
  color: '#e2e8f0',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  flexWrap: 'nowrap' as const,
};

/** A number input styled to fill a HoldingMetricCell - large, legible, sized to its digits so the % sign sits right beside it instead of wrapping below. */
export const holdingMetricInput = {
  width: '52px',
  flex: '0 0 auto',
  minWidth: 0,
  padding: '2px 0',
  border: 'none',
  background: 'transparent',
  color: '#e2e8f0',
  fontSize: '16px',
  fontWeight: 700,
  outline: 'none',
};

export const holdingMetricInputOverridden = {
  ...holdingMetricInput,
  color: '#93c5fd',
};
