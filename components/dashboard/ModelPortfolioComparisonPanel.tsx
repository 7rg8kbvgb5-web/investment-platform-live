import type {
  ProposedOverlayDraft,
  StrategicAllocation,
  TacticalOverlay,
} from '../../domain/types/allocation';
import { compareToModelPortfolio } from '../../lib/engines/compare-to-model-portfolio';
import {
  buildProposedTacticalOverlays,
  isProposedOverlayDraftComplete,
} from '../../lib/engines/build-proposed-tactical-overlays';
import { simulatePortfolioChanges } from '../../lib/engines/simulate-portfolio-changes';
import StatusBox from './StatusBox';

type ModelPortfolioComparisonPanelProps = {
  strategicAllocations: StrategicAllocation[];
  tacticalOverlays: TacticalOverlay[];
  riskProfileName: string;
  proposedDraft?: ProposedOverlayDraft | null;
};

function formatPosition(position: string): string {
  if (position === 'overweight') {
    return 'Overweight';
  }
  if (position === 'underweight') {
    return 'Underweight';
  }
  return 'Neutral';
}

export default function ModelPortfolioComparisonPanel({
  strategicAllocations,
  tacticalOverlays,
  riskProfileName,
  proposedDraft = null,
}: ModelPortfolioComparisonPanelProps) {
  const profileOverlays = tacticalOverlays.filter(
    (overlay) => overlay.risk_profile === riskProfileName
  );
  const hasActiveOverlays = profileOverlays.some(
    (overlay) => overlay.status === 'Active'
  );
  const hasProposedOverlay =
    proposedDraft !== null &&
    isProposedOverlayDraftComplete(proposedDraft);

  if (!hasProposedOverlay && !hasActiveOverlays) {
    return null;
  }

  const modelAllocations = strategicAllocations.filter(
    (allocation) => allocation.risk_profile === riskProfileName
  );

  const simulation = simulatePortfolioChanges({
    riskProfileName,
    strategicAllocations,
    currentTacticalOverlays: tacticalOverlays,
    proposedTacticalOverlays: hasProposedOverlay
      ? buildProposedTacticalOverlays(
          tacticalOverlays,
          proposedDraft!,
          riskProfileName
        )
      : undefined,
    resetToStrategic: !hasProposedOverlay && hasActiveOverlays,
  });

  const rows = compareToModelPortfolio({
    simulatedAllocations: simulation.simulatedAllocations,
    modelAllocations,
  });

  return (
    <div style={panel}>
      <h3 style={title}>Model Portfolio Comparison</h3>
      <StatusBox variant="neutral">
        Simulated portfolio vs strategic model — read-only, ±0.5% neutral band
      </StatusBox>

      {rows.length === 0 ? (
        <StatusBox variant="success">
          No asset classes to compare for this risk profile
        </StatusBox>
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={tableHeader}>Asset Class</th>
              <th style={tableHeader}>Simulated</th>
              <th style={tableHeader}>Model</th>
              <th style={tableHeader}>Difference</th>
              <th style={tableHeader}>Position</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.assetClass}>
                <td style={tableCell}>{row.assetClass}</td>
                <td style={tableCell}>{row.simulatedWeight}%</td>
                <td style={tableCell}>{row.modelWeight}%</td>
                <td style={tableCell}>
                  {row.difference > 0 ? '+' : ''}
                  {row.difference}%
                </td>
                <td style={tableCell}>{formatPosition(row.position)}</td>
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

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  marginTop: '12px',
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
