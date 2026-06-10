'use client';

import { useMemo, useState } from 'react';
import type {
  FundMonitoringDecision,
  FundMonitoringDecisionAction,
  MonitoredFund,
} from '../domain/types/fund-monitoring';
import { getMockMonitoredFunds } from '../lib/engines/fund-monitoring';
import {
  FUND_MONITORING_DECISION_ACTIONS,
  createFundReviewDecision,
  formatFundMonitoringDecisionAction,
  getDecisionsForFund,
  getLatestDecisionForFund,
  getMockFundReviewDecisions,
  summariseFundReviewDecisions,
} from '../lib/engines/fund-review-decisions';
import { formatIsoTimestampDisplay } from '../lib/format-timestamp';
import StatusBox from './dashboard/StatusBox';

function actionVariant(
  action: FundMonitoringDecisionAction
): 'success' | 'warning' | 'neutral' {
  switch (action) {
    case 'keep':
      return 'success';
    case 'watch':
    case 'defer':
    case 'request_more_research':
      return 'warning';
    case 'replace':
      return 'neutral';
  }
}

function badge(variant: 'success' | 'warning' | 'neutral') {
  const colors = {
    success: { bg: '#14532d', text: '#86efac', border: '#166534' },
    warning: { bg: '#713f12', text: '#fbbf24', border: '#854d0e' },
    neutral: { bg: '#1e3a5f', text: '#93c5fd', border: '#2d4a6b' },
  };
  const { bg, text, border } = colors[variant];
  return {
    display: 'inline-block' as const,
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    background: bg,
    color: text,
    border: `1px solid ${border}`,
  };
}

function replacementOptionsForFund(fund: MonitoredFund) {
  if (fund.replacementCandidate) {
    return [fund.replacementCandidate];
  }

  return [];
}

type FundReviewDecisionPanelProps = {
  onDecisionRecorded?: (decision: FundMonitoringDecision) => void;
};

export default function FundReviewDecisionPanel({
  onDecisionRecorded,
}: FundReviewDecisionPanelProps = {}) {
  const monitoredFunds = useMemo(() => getMockMonitoredFunds(), []);

  const [selectedFundId, setSelectedFundId] = useState<string>(
    monitoredFunds[0]?.fundId ?? ''
  );
  const [selectedAction, setSelectedAction] =
    useState<FundMonitoringDecisionAction | null>(null);
  const [rationale, setRationale] = useState('');
  const [replacementFundId, setReplacementFundId] = useState('');
  const [decisions, setDecisions] = useState<FundMonitoringDecision[]>(() =>
    getMockFundReviewDecisions()
  );

  const selectedFund = useMemo(
    () =>
      monitoredFunds.find((fund) => fund.fundId === selectedFundId) ?? null,
    [monitoredFunds, selectedFundId]
  );

  const replacementOptions = useMemo(
    () => (selectedFund ? replacementOptionsForFund(selectedFund) : []),
    [selectedFund]
  );

  const summary = useMemo(
    () => summariseFundReviewDecisions(decisions),
    [decisions]
  );

  const latestDecisionForSelectedFund = useMemo(
    () => getLatestDecisionForFund(decisions, selectedFundId),
    [decisions, selectedFundId]
  );

  const decisionHistoryForSelectedFund = useMemo(
    () => getDecisionsForFund(decisions, selectedFundId),
    [decisions, selectedFundId]
  );

  const replaceRequiresSelection =
    selectedAction === 'replace' && replacementOptions.length > 0;

  const canRecordDecision =
    Boolean(selectedAction) &&
    rationale.trim().length > 0 &&
    Boolean(selectedFund) &&
    (!replaceRequiresSelection || replacementFundId.length > 0);

  function resetForm() {
    setSelectedAction(null);
    setRationale('');
    setReplacementFundId('');
  }

  function handleRecordDecision() {
    if (!selectedAction || !selectedFund || !canRecordDecision) {
      return;
    }

    const selectedReplacement = replacementOptions.find(
      (candidate) => candidate.fundId === replacementFundId
    );

    const decision = createFundReviewDecision({
      fundId: selectedFund.fundId,
      fundName: selectedFund.fundName,
      action: selectedAction,
      rationale: rationale.trim(),
      replacementFundId: selectedReplacement?.fundId ?? null,
      replacementFundName: selectedReplacement?.fundName ?? null,
      decisionIndex: decisions.length,
    });

    if (!decision) {
      return;
    }

    setDecisions((current) => [...current, decision]);
    onDecisionRecorded?.(decision);
    resetForm();
  }

  return (
    <div style={panel}>
      <h3 style={title}>Fund Review Decisions</h3>

      <StatusBox variant="neutral">
        Governed adviser decisions on monitored fund assessments. Local mock
        state only — no portfolio changes or Supabase writes.
      </StatusBox>

      <div style={summaryGrid}>
        <div style={summaryItem}>
          <span style={summaryLabel}>Total decisions</span>
          <span style={summaryValue}>{summary.totalDecisions}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Funds with decisions</span>
          <span style={summaryValue}>{summary.fundsWithDecisions}</span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Keep / watch</span>
          <span style={summaryValue}>
            {summary.keepCount} / {summary.watchCount}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Replace / defer</span>
          <span style={{ ...summaryValue, color: '#93c5fd' }}>
            {summary.replaceCount} / {summary.deferCount}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={summaryLabel}>Research requests</span>
          <span style={{ ...summaryValue, color: '#fbbf24' }}>
            {summary.requestMoreResearchCount}
          </span>
        </div>
      </div>

      <h4 style={sectionTitle}>Record decision</h4>

      <label style={fieldLabel}>
        Fund under review
        <select
          style={select}
          value={selectedFundId}
          onChange={(event) => {
            setSelectedFundId(event.target.value);
            resetForm();
          }}
        >
          {monitoredFunds.map((fund) => (
            <option key={fund.fundId} value={fund.fundId}>
              {fund.fundName} ({fund.status})
            </option>
          ))}
        </select>
      </label>

      {selectedFund && (
        <div style={metadataGrid}>
          <div style={metadataItem}>
            <span style={metadataLabel}>Asset class</span>
            <span style={metadataValue}>{selectedFund.assetClass}</span>
          </div>
          <div style={metadataItem}>
            <span style={metadataLabel}>Monitoring status</span>
            <span style={metadataValue}>{selectedFund.status}</span>
          </div>
          <div style={metadataItem}>
            <span style={metadataLabel}>Review reason</span>
            <span style={metadataValue}>{selectedFund.reviewReason}</span>
          </div>
          <div style={metadataItem}>
            <span style={metadataLabel}>Latest decision</span>
            <span style={metadataValue}>
              {latestDecisionForSelectedFund
                ? formatFundMonitoringDecisionAction(
                    latestDecisionForSelectedFund.action
                  )
                : 'None recorded'}
            </span>
          </div>
        </div>
      )}

      <fieldset style={actionFieldset}>
        <legend style={fieldLegend}>Adviser action</legend>
        <div style={actionChoices}>
          {FUND_MONITORING_DECISION_ACTIONS.map((action) => (
            <label key={action} style={actionChoiceLabel}>
              <input
                type="radio"
                name="fund-monitoring-decision-action"
                checked={selectedAction === action}
                onChange={() => {
                  setSelectedAction(action);
                  if (action !== 'replace') {
                    setReplacementFundId('');
                  }
                }}
              />
              {formatFundMonitoringDecisionAction(action)}
            </label>
          ))}
        </div>
      </fieldset>

      {selectedAction === 'replace' && selectedFund && (
        <label style={fieldLabel}>
          Replacement fund
          {replacementOptions.length > 0 ? (
            <select
              style={select}
              value={replacementFundId}
              onChange={(event) => setReplacementFundId(event.target.value)}
            >
              <option value="">Select replacement fund…</option>
              {replacementOptions.map((candidate) => (
                <option key={candidate.fundId} value={candidate.fundId}>
                  {candidate.fundName}
                </option>
              ))}
            </select>
          ) : (
            <StatusBox variant="warning">
              No replacement candidate on file for this fund. Add a candidate in
              fund monitoring data before recording a Replace decision.
            </StatusBox>
          )}
        </label>
      )}

      <label style={fieldLabel}>
        Rationale / comment
        <textarea
          style={textarea}
          rows={3}
          value={rationale}
          onChange={(event) => setRationale(event.target.value)}
          placeholder="Document the adviser rationale for this decision…"
        />
      </label>

      <div style={actionsRow}>
        <button
          type="button"
          style={{
            ...recordButton,
            opacity: canRecordDecision ? 1 : 0.5,
            cursor: canRecordDecision ? 'pointer' : 'not-allowed',
          }}
          disabled={!canRecordDecision}
          onClick={handleRecordDecision}
        >
          Record decision
        </button>
        <button type="button" style={secondaryButton} onClick={resetForm}>
          Clear form
        </button>
      </div>

      <h4 style={sectionTitle}>Decision history — selected fund</h4>

      {decisionHistoryForSelectedFund.length === 0 ? (
        <StatusBox variant="neutral">
          No decisions recorded for this fund yet.
        </StatusBox>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Action</th>
                <th style={th}>Rationale</th>
                <th style={th}>Decided by</th>
                <th style={th}>Decided at</th>
                <th style={th}>Next review</th>
                <th style={th}>Replacement</th>
              </tr>
            </thead>
            <tbody>
              {[...decisionHistoryForSelectedFund].reverse().map((decision) => (
                <tr key={decision.id}>
                  <td style={td}>
                    <span style={badge(actionVariant(decision.action))}>
                      {formatFundMonitoringDecisionAction(decision.action)}
                    </span>
                  </td>
                  <td style={td}>{decision.rationale}</td>
                  <td style={td}>{decision.decidedBy}</td>
                  <td style={td}>
                    {formatIsoTimestampDisplay(decision.decidedAt)}
                  </td>
                  <td style={td}>{decision.nextReviewDate ?? '—'}</td>
                  <td style={td}>
                    {decision.replacementFundName ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h4 style={sectionTitle}>Latest decision per fund</h4>

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Fund</th>
              <th style={th}>Latest action</th>
              <th style={th}>Rationale</th>
              <th style={th}>Decided at</th>
            </tr>
          </thead>
          <tbody>
            {monitoredFunds.map((fund) => {
              const latest = getLatestDecisionForFund(decisions, fund.fundId);

              return (
                <tr key={fund.fundId}>
                  <td style={td}>
                    <span style={fundNameCell}>{fund.fundName}</span>
                  </td>
                  <td style={td}>
                    {latest ? (
                      <span style={badge(actionVariant(latest.action))}>
                        {formatFundMonitoringDecisionAction(latest.action)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={td}>{latest?.rationale ?? '—'}</td>
                  <td style={td}>
                    {latest
                      ? formatIsoTimestampDisplay(latest.decidedAt)
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={footnote}>
        Decisions are stored in local component state only. Portfolio holdings
        are not changed automatically.
      </p>
    </div>
  );
}

const panel = {
  marginTop: '32px',
  padding: '24px',
  background: '#0f2744',
  borderRadius: '12px',
  border: '1px solid #2d4a6b',
};

const title = {
  margin: '0 0 16px 0',
  fontSize: '18px',
  fontWeight: 700,
};

const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '12px',
  marginBottom: '20px',
};

const summaryItem = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  padding: '12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const summaryLabel = {
  fontSize: '12px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const summaryValue = {
  fontSize: '20px',
  fontWeight: 700,
};

const sectionTitle = {
  margin: '20px 0 12px 0',
  fontSize: '15px',
  fontWeight: 600,
  color: '#94a3b8',
};

const metadataGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '12px',
  marginBottom: '16px',
};

const metadataItem = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  padding: '12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
};

const metadataLabel = {
  fontSize: '12px',
  color: '#94a3b8',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const metadataValue = {
  fontSize: '14px',
  fontWeight: 600,
};

const fieldLabel = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
  fontSize: '13px',
  color: '#94a3b8',
  marginBottom: '16px',
};

const select = {
  padding: '10px 12px',
  background: '#0f2744',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '14px',
  fontFamily: 'inherit',
};

const actionFieldset = {
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '0 0 16px 0',
};

const fieldLegend = {
  padding: '0 6px',
  fontSize: '13px',
  color: '#94a3b8',
};

const actionChoices = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '12px 20px',
};

const actionChoiceLabel = {
  display: 'flex',
  alignItems: 'center' as const,
  gap: '8px',
  fontSize: '14px',
  cursor: 'pointer',
};

const textarea = {
  padding: '10px 12px',
  background: '#0f2744',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '14px',
  resize: 'vertical' as const,
  fontFamily: 'inherit',
};

const actionsRow = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '10px',
  marginBottom: '8px',
};

const recordButton = {
  padding: '10px 16px',
  borderRadius: '8px',
  fontSize: '14px',
  border: '1px solid #2d4a6b',
  background: '#12345b',
  color: '#93c5fd',
  cursor: 'pointer',
};

const secondaryButton = {
  padding: '10px 16px',
  borderRadius: '8px',
  fontSize: '14px',
  border: '1px solid #334155',
  background: 'transparent',
  color: '#94a3b8',
  cursor: 'pointer',
};

const tableWrap = {
  overflowX: 'auto' as const,
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '13px',
};

const th = {
  textAlign: 'left' as const,
  padding: '10px 12px',
  borderBottom: '1px solid #334155',
  color: '#94a3b8',
  fontWeight: 600,
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const td = {
  padding: '10px 12px',
  borderBottom: '1px solid #1e293b',
  verticalAlign: 'top' as const,
};

const fundNameCell = {
  fontWeight: 600,
};

const footnote = {
  marginTop: '16px',
  marginBottom: 0,
  fontSize: '12px',
  color: '#64748b',
};
