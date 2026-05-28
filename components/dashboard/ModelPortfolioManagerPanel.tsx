'use client';

import { useMemo, useState } from 'react';
import type { StrategicAllocation } from '../../domain/types/allocation';
import {
  buildModelPortfolioFromStrategic,
  type ModelPortfolio,
} from '../../domain/types/model-portfolio';
import StatusBox from './StatusBox';

type ModelPortfolioManagerPanelProps = {
  strategicAllocations: StrategicAllocation[];
  riskProfileName: string;
};

export default function ModelPortfolioManagerPanel({
  strategicAllocations,
  riskProfileName,
}: ModelPortfolioManagerPanelProps) {
  const activeModel = useMemo(
    () =>
      buildModelPortfolioFromStrategic({
        riskProfileName,
        strategicAllocations,
      }),
    [riskProfileName, strategicAllocations]
  );

  const [selectedModelId, setSelectedModelId] = useState(activeModel.modelName);

  const availableModels: ModelPortfolio[] = useMemo(
    () => [activeModel],
    [activeModel]
  );

  const displayedModel =
    availableModels.find((model) => model.modelName === selectedModelId) ??
    activeModel;

  const totalTargetWeight = displayedModel.allocationRows.reduce(
    (sum, row) => sum + Number(row.target_weight),
    0
  );

  return (
    <div style={panel}>
      <h3 style={title}>Model Portfolio Manager</h3>
      <StatusBox variant="neutral">
        Local preview only — model data is not persisted to the database
      </StatusBox>

      <label style={selectorField}>
        <span style={selectorLabel}>Active model (placeholder)</span>
        <select
          value={selectedModelId}
          onChange={(event) => setSelectedModelId(event.target.value)}
          style={select}
          disabled={availableModels.length <= 1}
          aria-label="Select model portfolio"
        >
          {availableModels.map((model) => (
            <option key={model.modelName} value={model.modelName}>
              {model.modelName}
            </option>
          ))}
        </select>
      </label>

      {availableModels.length <= 1 ? (
        <StatusBox variant="success">
          Multiple model portfolios will be selectable here in a future release
        </StatusBox>
      ) : null}

      <div style={metadataGrid}>
        <div style={metadataItem}>
          <span style={metadataLabel}>Model name</span>
          <span style={metadataValue}>{displayedModel.modelName}</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Risk profile</span>
          <span style={metadataValue}>{displayedModel.riskProfile}</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Version</span>
          <span style={metadataValue}>{displayedModel.version}</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Created</span>
          <span style={metadataValue}>{displayedModel.createdDate}</span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Asset classes</span>
          <span style={metadataValue}>
            {displayedModel.allocationRows.length}
          </span>
        </div>
        <div style={metadataItem}>
          <span style={metadataLabel}>Total target weight</span>
          <span style={metadataValue}>{totalTargetWeight}%</span>
        </div>
      </div>

      {displayedModel.allocationRows.length === 0 ? (
        <StatusBox variant="warning">
          No allocation rows found for this risk profile
        </StatusBox>
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={tableHeader}>Asset Class</th>
              <th style={tableHeader}>Target</th>
              <th style={tableHeader}>Min</th>
              <th style={tableHeader}>Max</th>
              <th style={tableHeader}>Classification</th>
            </tr>
          </thead>
          <tbody>
            {displayedModel.allocationRows.map((row) => (
              <tr key={row.id}>
                <td style={tableCell}>{row.asset_class}</td>
                <td style={tableCell}>{row.target_weight}%</td>
                <td style={tableCell}>{row.min_weight}%</td>
                <td style={tableCell}>{row.max_weight}%</td>
                <td style={tableCell}>{row.classification}</td>
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

const selectorField = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
  marginBottom: '16px',
  maxWidth: '420px',
};

const selectorLabel = {
  fontSize: '14px',
  color: '#94a3b8',
};

const select = {
  padding: '10px 12px',
  background: '#12345b',
  border: '1px solid #2d4a6b',
  borderRadius: '8px',
  color: 'white',
  fontSize: '14px',
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

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  marginTop: '8px',
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
