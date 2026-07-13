'use client';

import { useEffect, useState } from 'react';
import type { WeeklyBrief } from '../domain/types/weekly-brief';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

export default function WeeklyBriefPanel() {
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/weekly-brief/latest');
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error ?? 'Failed to load weekly brief.');
      }
      setBrief(data.brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weekly brief.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRunNow() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch('/api/weekly-brief/run-now', { method: 'POST' });
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error ?? 'Failed to generate brief.');
      }
      setBrief(data.brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate brief.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <section style={panel}>
      <div style={headerRow}>
        <div>
          <p style={eyebrow}>Weekly Research Brief</p>
          <h2 style={heading}>Monday Macro &amp; Security Scan</h2>
          <p style={description}>
            Runs automatically every Monday morning, scanning for macro
            events, Approved List security news, and best-in-class
            alternative flags. Adviser recommendations only — nothing here
            triggers a trade.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunNow}
          disabled={running}
          style={runButton}
        >
          {running ? 'Running…' : 'Run Now'}
        </button>
      </div>

      {error ? <StatusBox variant="error">{error}</StatusBox> : null}

      {loading ? (
        <p style={footnote}>Loading latest brief…</p>
      ) : !brief ? (
        <p style={footnote}>
          No brief has been generated yet. This is expected until the
          Monday cron first fires, or you run one manually above — see the
          setup notes for the ANTHROPIC_API_KEY requirement.
        </p>
      ) : (
        <div style={{ marginTop: '20px' }}>
          <p style={weekLabel}>
            Week of {brief.weekOf} — generated{' '}
            {formatIsoTimestampDisplay(brief.generatedAt)}
          </p>

          <p style={bodyText}>{brief.macroSummary}</p>

          {brief.securityAlerts.length === 0 &&
          brief.alternativeFlags.length === 0 &&
          brief.rawModelOutput ? (
            <details style={rawOutputBox}>
              <summary style={rawOutputSummary}>
                Show raw model output (for debugging)
              </summary>
              <pre style={rawOutputPre}>{brief.rawModelOutput}</pre>
            </details>
          ) : null}

          {brief.securityAlerts.length > 0 ? (
            <div style={{ marginTop: '18px' }}>
              <p style={subheading}>Security Alerts</p>
              {brief.securityAlerts.map((alert, index) => (
                <div key={`${alert.ticker}-${index}`} style={alertCard}>
                  <p style={alertTitle}>
                    {alert.ticker} — {alert.headline}
                  </p>
                  <p style={alertDetail}>{alert.detail}</p>
                </div>
              ))}
            </div>
          ) : null}

          {brief.alternativeFlags.length > 0 ? (
            <div style={{ marginTop: '18px' }}>
              <p style={subheading}>Best-in-Class Alternative Flags</p>
              {brief.alternativeFlags.map((flag, index) => (
                <div key={`${flag.ticker}-${index}`} style={alertCard}>
                  <p style={alertTitle}>
                    {flag.ticker} → {flag.alternative}
                  </p>
                  <p style={alertDetail}>{flag.rationale}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

const panel = {
  marginTop: '32px',
  padding: '24px',
  background: '#0f2744',
  borderRadius: '12px',
  border: '1px solid #2d4a6b',
};

const headerRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start' as const,
  gap: '16px',
  flexWrap: 'wrap' as const,
};

const eyebrow = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#5eead4',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  marginBottom: '6px',
};

const heading = {
  fontSize: '20px',
  fontWeight: 700,
  marginTop: 0,
  marginBottom: '8px',
};

const description = {
  fontSize: '13px',
  color: '#94a3b8',
  lineHeight: 1.5,
  maxWidth: '640px',
};

const runButton = {
  padding: '10px 20px',
  background: '#1B7A7A',
  border: 'none',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
};

const footnote = {
  fontSize: '13px',
  color: '#64748b',
  marginTop: '16px',
};

const weekLabel = {
  fontSize: '12px',
  color: '#64748b',
  marginBottom: '10px',
};

const bodyText = {
  fontSize: '13px',
  lineHeight: 1.6,
  color: '#e2e8f0',
};

const rawOutputBox = {
  marginTop: '12px',
  padding: '10px 12px',
  background: '#04142b',
  border: '1px solid #2d4a6b',
  borderRadius: '8px',
};

const rawOutputSummary = {
  fontSize: '12px',
  color: '#5eead4',
  cursor: 'pointer',
  fontWeight: 600,
};

const rawOutputPre = {
  marginTop: '10px',
  fontSize: '11px',
  color: '#94a3b8',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
  maxHeight: '300px',
  overflowY: 'auto' as const,
};

const subheading = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  marginBottom: '10px',
};

const alertCard = {
  padding: '12px 14px',
  background: '#0b1f38',
  border: '1px solid #2d4a6b',
  borderRadius: '8px',
  marginBottom: '10px',
};

const alertTitle = {
  fontSize: '13px',
  fontWeight: 700,
  marginBottom: '4px',
};

const alertDetail = {
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: 1.5,
};
