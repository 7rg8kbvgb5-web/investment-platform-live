'use client';

import { useEffect, useState } from 'react';
import type { LiveSectorHealthScore } from '../lib/engines/sector-health-live';
import Badge, { type BadgeVariant } from './ui/Badge';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';

// Live sector health scoring, scoped to only the sectors actually
// represented in the model portfolio's holdings - replaces the
// previous fully-static 11-GICS-sector table that had no connection
// to what's actually held.

function recommendationVariant(recommendation: string): BadgeVariant {
  switch (recommendation) {
    case 'Strong Overweight':
    case 'Overweight':
      return 'success';
    case 'Neutral':
      return 'warning';
    default:
      return 'danger';
  }
}

export default function SectorHealthScorePanel() {
  const [scores, setScores] = useState<LiveSectorHealthScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    loadScores();
  }, []);

  async function loadScores() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/sector-health/latest');
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Failed to load sector health scores.');
      setScores(data.scores);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load sector health scores.');
    } finally {
      setLoading(false);
    }
  }

  async function runScan() {
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch('/api/sector-health/run-now', { method: 'POST' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Scan failed.');
      setScores(data.scores);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setScanning(false);
    }
  }

  const lastScanAt = scores.length > 0 ? scores[0].generatedAt : null;

  return (
    <Panel
      eyebrow="Scoped to sectors actually held in the model portfolio"
      title="Sector Health Score"
      actions={
        <button type="button" style={scanButton} onClick={runScan} disabled={scanning}>
          {scanning ? 'Scanning…' : 'Run scan'}
        </button>
      }
    >
      <p style={intro}>
        Sector positioning based on earnings revision momentum, breadth, relative strength,
        valuation opportunity, and house view overlay - live, and only for sectors the model
        portfolio actually holds.
      </p>

      <div style={metaRow}>
        <span style={metaText}>
          {lastScanAt
            ? `Last scan: ${new Date(lastScanAt).toLocaleString('en-AU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : 'No scan run yet'}
        </span>
      </div>

      {scanError && (
        <StatusBox variant="error" display="inline">
          {scanError}
        </StatusBox>
      )}

      {loading ? (
        <StatusBox variant="neutral" display="inline">
          Loading…
        </StatusBox>
      ) : loadError ? (
        <StatusBox variant="error" display="inline">
          {loadError}
        </StatusBox>
      ) : scores.length === 0 ? (
        <StatusBox variant="neutral" display="inline">
          No scan run yet — click &quot;Run scan&quot; to score the sectors currently held in the
          model portfolio.
        </StatusBox>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Sector</th>
                <th>Score</th>
                <th>Recommendation</th>
                <th>Earnings Momentum</th>
                <th>Breadth</th>
                <th>Relative Strength</th>
                <th>Valuation</th>
                <th>House View</th>
              </tr>
            </thead>

            <tbody>
              {scores.map((sector, index) => (
                <tr key={sector.sector} title={sector.rationale ?? undefined}>
                  <td style={{ fontWeight: 700 }}>#{index + 1}</td>
                  <td style={{ fontWeight: 600 }}>{sector.sector}</td>
                  <td style={{ fontWeight: 700 }}>{sector.totalScore.toFixed(1)}</td>
                  <td>
                    <Badge variant={recommendationVariant(sector.recommendation)}>
                      {sector.recommendation}
                    </Badge>
                  </td>
                  <td>{sector.earningsRevisionMomentum}</td>
                  <td>{sector.earningsBreadth}</td>
                  <td>{sector.relativeStrength}</td>
                  <td>{sector.valuationOpportunity}</td>
                  <td>{sector.houseViewOverlay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

const intro = {
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
  marginTop: '-8px',
  marginBottom: '10px',
  lineHeight: 1.5,
};

const metaRow = {
  marginBottom: '10px',
};

const metaText = {
  fontSize: '12px',
  color: '#94a3b8',
};

const scanButton = {
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 700,
  background: '#0f3d2e',
  border: '1px solid #10b981',
  color: '#86efac',
  cursor: 'pointer',
};
