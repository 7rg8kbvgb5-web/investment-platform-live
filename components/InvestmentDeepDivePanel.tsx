'use client';

import { useEffect, useState } from 'react';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';
import type { DeepDiveReview, SubjectType } from '../lib/engines/investment-deep-dive';

// Due-diligence deep dive for a NEW investment being considered - an
// IPO/newly listed company, or a new unlisted fund (credit, alts,
// hedge, infrastructure, etc). Distinct from Monitoring (existing
// model holdings) and Fund Reviews (funds already held): this is for
// something not yet in the portfolio, surfacing management, board,
// regional exposure, earnings quality, track record, and macro
// considerations before a decision is made.

const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  ipo_listed: 'IPO / Listed Company',
  unlisted_fund: 'Unlisted Fund',
  other: 'Other',
};

export function InvestmentDeepDivePanel() {
  const [subjectName, setSubjectName] = useState('');
  const [subjectTypeHint, setSubjectTypeHint] = useState<SubjectType | ''>('');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [activeReview, setActiveReview] = useState<DeepDiveReview | null>(null);

  const [pastReviews, setPastReviews] = useState<DeepDiveReview[]>([]);
  const [pastLoading, setPastLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    loadPastReviews();
  }, []);

  async function loadPastReviews() {
    setPastLoading(true);
    try {
      const res = await fetch('/api/investment-committee/deep-dive-list');
      const data = await res.json();
      if (data.ok) setPastReviews(data.reviews);
    } finally {
      setPastLoading(false);
    }
  }

  async function runDeepDive() {
    if (!subjectName.trim()) return;
    setRunning(true);
    setRunError(null);
    try {
      const res = await fetch('/api/investment-committee/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectName, subjectTypeHint: subjectTypeHint || null }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Deep dive failed.');
      setActiveReview(data.review);
      await loadPastReviews();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Deep dive failed.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <Panel
      eyebrow="Due diligence on a NEW investment being considered — IPOs, new unlisted funds"
      title="Investment Deep Dive"
    >
      <p style={intro}>
        A research dossier for the committee before bringing something new onto the Approved
        List — management team, board/governance (including any past issues with specific
        directors), regional exposure, earnings or strategy quality, track record, and macro
        considerations. This doesn&apos;t replace a formal PDS/prospectus/IM read or legal due
        diligence.
      </p>

      <div style={searchRow}>
        <input
          type="text"
          placeholder="Company, IPO, or fund name"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runDeepDive();
          }}
          style={searchInput}
        />
        <select
          value={subjectTypeHint}
          onChange={(e) => setSubjectTypeHint(e.target.value as SubjectType | '')}
          style={typeSelect}
        >
          <option value="">Type (optional)</option>
          <option value="ipo_listed">IPO / Listed Company</option>
          <option value="unlisted_fund">Unlisted Fund</option>
        </select>
        <button type="button" onClick={runDeepDive} disabled={running} style={runButton}>
          {running ? 'Researching…' : 'Run deep dive'}
        </button>
      </div>

      {runError && (
        <StatusBox variant="error" display="inline">
          {runError}
        </StatusBox>
      )}

      <div style={pastToggleRow}>
        <button type="button" style={pastToggleButton} onClick={() => setShowPast((v) => !v)}>
          {showPast ? 'Hide' : 'Show'} past reviews {pastLoading ? '' : `(${pastReviews.length})`}
        </button>
      </div>

      {showPast && (
        <div style={pastList}>
          {pastReviews.length === 0 ? (
            <p style={emptyText}>No deep dives run yet.</p>
          ) : (
            pastReviews.map((review) => (
              <button
                key={review.id}
                type="button"
                style={pastRow}
                onClick={() => setActiveReview(review)}
              >
                <span style={pastRowName}>{review.subjectName}</span>
                <span style={pastRowType}>{SUBJECT_TYPE_LABELS[review.subjectType]}</span>
                <span style={pastRowDate}>
                  {new Date(review.generatedAt).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {activeReview && (
        <div style={reviewBox}>
          <div style={reviewHeader}>
            <div>
              <h4 style={reviewTitle}>{activeReview.subjectName}</h4>
              <span style={reviewTypeTag}>{SUBJECT_TYPE_LABELS[activeReview.subjectType]}</span>
            </div>
            <span style={reviewDate}>
              {new Date(activeReview.generatedAt).toLocaleString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <p style={reviewSummary}>{activeReview.summary}</p>

          {activeReview.keyRisks.length > 0 && (
            <div style={keyRisksBox}>
              <p style={keyRisksTitle}>Key risks to weigh</p>
              <ul style={keyRisksList}>
                {activeReview.keyRisks.map((risk, i) => (
                  <li key={i} style={keyRisksItem}>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={sectionsGrid}>
            {activeReview.sections.map((section, i) => (
              <div key={i} style={sectionCard}>
                <h5 style={sectionHeading}>{section.heading}</h5>
                <p style={sectionBody}>{section.body}</p>
                {section.flags.length > 0 && (
                  <ul style={sectionFlagsList}>
                    {section.flags.map((flag, j) => (
                      <li key={j} style={sectionFlagItem}>
                        {flag}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
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
  flexWrap: 'wrap' as const,
  gap: '10px',
  marginBottom: '10px',
};

const searchInput = {
  flex: '1 1 260px',
  padding: '9px 12px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  background: '#04142b',
  border: '1px solid #2d4a6b',
  color: '#e2e8f0',
};

const typeSelect = {
  padding: '9px 12px',
  borderRadius: '8px',
  fontSize: '13px',
  background: '#04142b',
  border: '1px solid #2d4a6b',
  color: '#93c5fd',
};

const runButton = {
  padding: '9px 18px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 700,
  background: '#0f3d2e',
  border: '1px solid #10b981',
  color: '#86efac',
  cursor: 'pointer',
};

const pastToggleRow = {
  marginBottom: '10px',
};

const pastToggleButton = {
  padding: '5px 12px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  background: 'transparent',
  border: '1px solid #2d4a6b',
  color: '#93c5fd',
  cursor: 'pointer',
};

const pastList = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
  marginBottom: '16px',
};

const pastRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 12px',
  borderRadius: '8px',
  background: '#0b2342',
  border: '1px solid #1e3a5f',
  cursor: 'pointer',
  textAlign: 'left' as const,
  width: '100%',
};

const pastRowName = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#e2e8f0',
};

const pastRowType = {
  fontSize: '11px',
  color: '#93c5fd',
};

const pastRowDate = {
  marginLeft: 'auto',
  fontSize: '11px',
  color: '#64748b',
};

const reviewBox = {
  padding: '16px 18px',
  borderRadius: '12px',
  background: '#0b2447',
  border: '1px solid #2d4a6b',
};

const reviewHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap' as const,
  gap: '10px',
  marginBottom: '10px',
};

const reviewTitle = {
  margin: '0 0 4px',
  fontSize: '18px',
  fontWeight: 700,
  color: '#38bdf8',
};

const reviewTypeTag = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#93c5fd',
};

const reviewDate = {
  fontSize: '11px',
  color: '#64748b',
};

const reviewSummary = {
  fontSize: '13px',
  color: '#cbd5e1',
  lineHeight: 1.6,
  marginBottom: '14px',
};

const keyRisksBox = {
  padding: '10px 14px',
  borderRadius: '10px',
  background: '#3f2b12',
  border: '1px solid #f59e0b',
  marginBottom: '16px',
};

const keyRisksTitle = {
  margin: '0 0 6px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#fbbf24',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.03em',
};

const keyRisksList = {
  margin: 0,
  paddingLeft: '18px',
};

const keyRisksItem = {
  fontSize: '13px',
  color: '#fde68a',
  lineHeight: 1.6,
};

const sectionsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '14px',
};

const sectionCard = {
  padding: '12px 14px',
  borderRadius: '10px',
  background: '#0d1f38',
  border: '1px solid #1e3a5f',
};

const sectionHeading = {
  margin: '0 0 6px',
  fontSize: '13px',
  fontWeight: 700,
  color: '#e2e8f0',
};

const sectionBody = {
  margin: 0,
  fontSize: '12px',
  color: '#cbd5e1',
  lineHeight: 1.6,
};

const sectionFlagsList = {
  margin: '8px 0 0',
  paddingLeft: '16px',
};

const sectionFlagItem = {
  fontSize: '12px',
  color: '#fca5a5',
  lineHeight: 1.5,
};

const emptyText = {
  margin: 0,
  fontSize: '12px',
  color: '#94a3b8',
  fontStyle: 'italic' as const,
};
