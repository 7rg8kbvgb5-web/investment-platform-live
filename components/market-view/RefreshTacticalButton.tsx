'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Re-runs the Tactical Asset Class View scan, then refreshes the page. */
export default function RefreshTacticalButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/tactical-view/run-now', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.ok === false) throw new Error(body.error ?? 'The scan failed.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The scan failed.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      {error ? <span style={{ fontSize: '12px', color: '#fca5a5' }}>{error}</span> : null}
      <button type="button" onClick={run} disabled={running} style={button}>
        {running ? 'Reading markets… (up to 2 min)' : 'Refresh view'}
      </button>
    </span>
  );
}

const button = {
  padding: '7px 14px',
  borderRadius: '8px',
  border: '1px solid #38bdf8',
  background: '#0c3a5c',
  color: '#e0f2fe',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};
