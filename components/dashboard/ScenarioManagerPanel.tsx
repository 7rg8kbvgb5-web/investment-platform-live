'use client';

import type { Scenario, ScenarioStatus } from '../../domain/types/scenario';
import StatusBox from './StatusBox';

type ScenarioManagerPanelProps = {
  currentScenario: Scenario;
  savedScenarios?: Scenario[];
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ScenarioManagerPanel({
  currentScenario,
  savedScenarios = [],
}: ScenarioManagerPanelProps) {
  const hasSimulation = currentScenario.simulationSummary?.simulationApplied;
  const hasOverlayDraft =
    currentScenario.proposedOverlayDraft !== null &&
    currentScenario.proposedOverlayDraft !== undefined;

  return (
    <div style={panel}>
      <h3 style={title}>Scenario Manager</h3>
      <StatusBox variant="neutral">
        Local preview only — scenarios are not saved to the database yet
      </StatusBox>

      <div style={metadataGrid}>
        <div style={metadataItem}>
          <span style={metadataLabel}>Current scenario</span>
          <span style={metadataValue}>{currentScenario.scenarioName}</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Risk profile</span>
          <span style={metadataValue}>{currentScenario.riskProfile}</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Status</span>
          <span style={metadataValue}>{currentScenario.status}</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Created</span>
          <span style={metadataValue}>
            {formatTimestamp(currentScenario.createdTimestamp)}
          </span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Proposed overlay draft</span>
          <span style={metadataValue}>{hasOverlayDraft ? 'Yes' : 'No'}</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Simulation ready</span>
          <span style={metadataValue}>
            {hasSimulation ? 'Yes' : 'Pending'}
          </span>
        </div>
      </div>

      {currentScenario.simulationSummary ? (
        <div style={summaryBox}>
          <span style={metadataLabel}>Last simulation</span>
          <span style={metadataValue}>
            {formatTimestamp(currentScenario.simulationSummary.timestamp)}
          </span>
          <span style={summaryDetail}>
            {currentScenario.simulationSummary.allocationDifferenceCount}{' '}
            allocation change
            {currentScenario.simulationSummary.allocationDifferenceCount === 1
              ? ''
              : 's'}
          </span>
        </div>
      ) : null}

      <div style={actionsRow}>
        <button type="button" style={saveButtonDisabled} disabled>
          Save scenario (coming soon)
        </button>
      </div>

      <h4 style={sectionTitle}>Saved scenarios (placeholder)</h4>
      {savedScenarios.length === 0 ? (
        <StatusBox variant="success">
          No saved scenarios yet — persistence will be added in a future release
        </StatusBox>
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={tableHeader}>Name</th>
              <th style={tableHeader}>Risk profile</th>
              <th style={tableHeader}>Status</th>
              <th style={tableHeader}>Created</th>
            </tr>
          </thead>
          <tbody>
            {savedScenarios.map((scenario) => (
              <tr key={`${scenario.scenarioName}-${scenario.createdTimestamp}`}>
                <td style={tableCell}>{scenario.scenarioName}</td>
                <td style={tableCell}>{scenario.riskProfile}</td>
                <td style={tableCell}>{scenario.status}</td>
                <td style={tableCell}>
                  {formatTimestamp(scenario.createdTimestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const panel = {
  marginTop: '25px',
};

const title = {
  margin: '0 0 16px 0',
  fontSize: '18px',
  fontWeight: 600,
};

const metadataGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
  fontSize: '15px',
  fontWeight: 600,
};

const summaryBox = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
  padding: '12px',
  background: '#12345b',
  borderRadius: '8px',
  border: '1px solid #2d4a6b',
  marginBottom: '16px',
};

const summaryDetail = {
  fontSize: '14px',
  color: '#cbd5e1',
};

const actionsRow = {
  marginBottom: '20px',
};

const saveButtonDisabled = {
  padding: '10px 16px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#64748b',
  fontSize: '14px',
  cursor: 'not-allowed',
};

const sectionTitle = {
  margin: '0 0 12px 0',
  fontSize: '15px',
  fontWeight: 600,
  color: '#94a3b8',
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const tableHeader = {
  padding: '12px',
  border: '1px solid #2d4a6b',
  textAlign: 'left' as const,
  background: '#12345b',
};

const tableCell = {
  padding: '12px',
  border: '1px solid #2d4a6b',
};
