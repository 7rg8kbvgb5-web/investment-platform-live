'use client';

import { useState } from 'react';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';
import type { ConsensusView } from '../lib/engines/consensus-view';
import { classifyRating } from '../lib/engines/rating-scale';

// Broker/analyst consensus, similar in spirit to FN Arena - but compiled
// live via web search rather than a licensed broker-note feed, since no
// such data provider is connected. Always labelled as AI-compiled so an
// adviser reads it with the right amount of confidence.

export function ConsensusViewPanel() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConsensusView | null>(null);

  async function runLookup() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/research/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Lookup failed.');
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel eyebrow="AI-compiled from public sources, not a licensed data feed" title="Consensus View">
      <p style={intro}>
        Type a ticker to pull together what&apos;s publicly findable on broker/analyst
        recommendations, price targets, and yield estimates for that security, with
        an aggregate view at the top.
      </p>

      <div style={searchRow}>
        <input
          type="text"
          placeholder="Ticker, e.g. BHP"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runLookup();
          }}
          style={searchInput}
        />
        <button type="button" onClick={runLookup} disabled={loading} style={searchButton}>
          {loading ? 'Searching…' : 'Look up'}
        </button>
      </div>

      {error && (
        <StatusBox variant="error" display="inline">
          {error}
        </StatusBox>
      )}

      {result && (
        <>
          <div style={aggregateBar}>
            <div style={aggregateHeader}>
              <span style={aggregateCode}>{result.code}</span>
              {result.name && <span style={aggregateName}>{result.name}</span>}
            </div>
            <div style={aggregateStatsRow}>
              <div style={aggregateStat}>
                <span style={aggregateStatLabel}>Consensus</span>
                <span
                  style={{
                    ...aggregateStatValue,
                    color: result.consensusRating
                      ? {
                          bullish: '#4ade80',
                          neutral: '#e2e8f0',
                          bearish: '#fca5a5',
                        }[classifyRating(result.consensusRating)]
                      : '#e2e8f0',
                  }}
                >
                  {result.consensusRating ?? '—'}
                </span>
              </div>
              <div style={aggregateStat}>
                <span style={aggregateStatLabel}>Avg. price target</span>
                <span style={aggregateStatValue}>
                  {result.averagePriceTarget !== null ? `$${result.averagePriceTarget}` : '—'}
                </span>
              </div>
              <div style={aggregateStat}>
                <span style={aggregateStatLabel}>Current price</span>
                <span style={aggregateStatValue}>
                  {result.currentPrice !== null ? `$${result.currentPrice}` : '—'}
                </span>
              </div>
              {result.currentPrice !== null && result.averagePriceTarget !== null && (
                <div style={aggregateStat}>
                  <span style={aggregateStatLabel}>Implied upside/downside</span>
                  <span
                    style={{
                      ...aggregateStatValue,
                      color:
                        result.averagePriceTarget >= result.currentPrice ? '#4ade80' : '#fca5a5',
                    }}
                  >
                    {result.averagePriceTarget >= result.currentPrice ? '+' : ''}
                    {Math.round(
                      ((result.averagePriceTarget - result.currentPrice) / result.currentPrice) * 1000,
                    ) / 10}
                    %
                  </span>
                </div>
              )}
              <div style={aggregateStat}>
                <span style={aggregateStatLabel}>Avg. yield</span>
                <span style={aggregateStatValue}>
                  {result.averageYield !== null ? `${result.averageYield}%` : '—'}
                </span>
              </div>
              <div style={aggregateStat}>
                <span style={aggregateStatLabel}>Contributing brokers</span>
                <span style={aggregateStatValue}>{result.recommendations.length}</span>
              </div>
            </div>
            {result.recommendations.length > 0 && (
              <div style={distributionRow}>
                {(['bullish', 'neutral', 'bearish'] as const).map((lean) => {
                  const count = result.recommendations.filter(
                    (r) => classifyRating(r.rating) === lean,
                  ).length
                  if (count === 0) return null
                  return (
                    <span key={lean} style={distributionChip(lean)}>
                      {count} {lean}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {result.recommendations.length === 0 ? (
            <StatusBox variant="neutral" display="inline">
              No individual broker recommendations could be found for {result.code} via search.
            </StatusBox>
          ) : (
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Institution</th>
                    <th style={th}>Rating</th>
                    <th style={th}>Price Target</th>
                    <th style={th}>Yield</th>
                    <th style={th}>As of</th>
                  </tr>
                </thead>
                <tbody>
                  {result.recommendations.map((rec, i) => (
                    <tr key={`${rec.institution}-${i}`}>
                      <td style={td}>{rec.institution}</td>
                      <td
                        style={{
                          ...td,
                          fontWeight: 700,
                          color: {
                            bullish: '#4ade80',
                            neutral: '#e2e8f0',
                            bearish: '#fca5a5',
                          }[classifyRating(rec.rating)],
                        }}
                      >
                        {rec.rating}
                      </td>
                      <td style={td}>{rec.priceTarget !== null ? `$${rec.priceTarget}` : '—'}</td>
                      <td style={td}>{rec.yieldEstimate !== null ? `${rec.yieldEstimate}%` : '—'}</td>
                      <td style={tdMuted}>{rec.asOf ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

const intro = {
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
  marginTop: '-8px',
  marginBottom: '14px',
  lineHeight: 1.5,
};

const searchRow = {
  display: 'flex',
  gap: '10px',
  marginBottom: '18px',
};

const searchInput = {
  flex: 1,
  maxWidth: '260px',
  padding: '9px 12px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 700,
  background: '#04142b',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
};

const searchButton = {
  padding: '9px 18px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 700,
  background: '#0f3d2e',
  border: '1px solid #10b981',
  color: '#86efac',
  cursor: 'pointer',
};

const aggregateBar = {
  padding: '14px 16px',
  borderRadius: '12px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
  marginBottom: '18px',
};

const aggregateHeader = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '10px',
  marginBottom: '10px',
};

const aggregateCode = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#38bdf8',
};

const aggregateName = {
  fontSize: '13px',
  color: '#94a3b8',
};

const aggregateStatsRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '20px',
};

const aggregateStat = {
  display: 'flex',
  flexDirection: 'column' as const,
};

const aggregateStatLabel = {
  fontSize: '11px',
  color: '#94a3b8',
};

const aggregateStatValue = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#4ade80',
  marginTop: '2px',
};

const distributionRow = {
  display: 'flex',
  gap: '8px',
  marginTop: '12px',
  paddingTop: '10px',
  borderTop: '1px dashed #2d4a6b',
};

function distributionChip(lean: 'bullish' | 'neutral' | 'bearish') {
  const colors = {
    bullish: { bg: '#0f3d2e', border: '#10b981', text: '#86efac' },
    neutral: { bg: '#12203a', border: '#1e3a5f', text: '#94a3b8' },
    bearish: { bg: '#4a1520', border: '#ef4444', text: '#fca5a5' },
  }[lean];
  return {
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    color: colors.text,
  };
}

const tableWrap = {
  overflowX: 'auto' as const,
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const th = {
  textAlign: 'left' as const,
  padding: '8px 10px',
  borderBottom: '1px solid #334155',
  color: '#94a3b8',
  fontWeight: 600,
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const td = {
  padding: '8px 10px',
  borderBottom: '1px solid #1e293b',
  color: '#e2e8f0',
  fontSize: '13px',
};

const tdMuted = {
  ...td,
  color: '#94a3b8',
};
