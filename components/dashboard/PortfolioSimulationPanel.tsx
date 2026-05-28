import type {
  ProposedOverlayDraft,
  StrategicAllocation,
  TacticalOverlay,
} from '../../domain/types/allocation';
import type { PortfolioGovernanceSummary } from '../../domain/types/portfolio';
import {
  buildProposedTacticalOverlays,
  isProposedOverlayDraftComplete,
} from '../../lib/engines/build-proposed-tactical-overlays';
import { simulatePortfolioChanges } from '../../lib/engines/simulate-portfolio-changes';
import StatusBox from './StatusBox';

type PortfolioSimulationPanelProps = {
  strategicAllocations: StrategicAllocation[];
  tacticalOverlays: TacticalOverlay[];
  riskProfileName: string;
  proposedDraft?: ProposedOverlayDraft | null;
};

function formatGovernanceChange(
  label: string,
  before: boolean | number,
  after: boolean | number
): string {
  if (typeof before === 'number' && typeof after === 'number') {
    const delta = after - before;
    if (delta === 0) {
      return `${label}: ${before} (unchanged)`;
    }
    const sign = delta > 0 ? '+' : '';
    return `${label}: ${before} → ${after} (${sign}${delta})`;
  }

  if (before === after) {
    return `${label}: ${before ? 'yes' : 'no'} (unchanged)`;
  }

  return `${label}: ${before ? 'yes' : 'no'} → ${after ? 'yes' : 'no'}`;
}

function GovernanceSummaryCard({
  title,
  before,
  after,
}: {
  title: string;
  before: PortfolioGovernanceSummary;
  after: PortfolioGovernanceSummary;
}) {
  return (
    <div style={card}>
      <h4 style={cardTitle}>{title}</h4>
      <ul style={list}>
        <li>
          {formatGovernanceChange(
            'Warnings',
            before.warningCount,
            after.warningCount
          )}
        </li>
        <li>
          {formatGovernanceChange(
            'Errors',
            before.errorCount,
            after.errorCount
          )}
        </li>
        <li>
          {formatGovernanceChange(
            'Approval required',
            before.approvalRequired,
            after.approvalRequired
          )}
        </li>
        <li>
          {formatGovernanceChange(
            'Hard breaches',
            before.hasHardBreaches,
            after.hasHardBreaches
          )}
        </li>
      </ul>
    </div>
  );
}

export default function PortfolioSimulationPanel({
  strategicAllocations,
  tacticalOverlays,
  riskProfileName,
  proposedDraft = null,
}: PortfolioSimulationPanelProps) {
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
    return (
      <StatusBox variant="success">
        No portfolio simulation to display — enter a proposed overlay above or
        apply active overlays to preview changes
      </StatusBox>
    );
  }

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

  const simulationMode = hasProposedOverlay
    ? 'proposed tactical overlay'
    : 'reset to strategic allocation';

  return (
    <div style={panel}>
      <h3 style={title}>Portfolio Simulation</h3>
      <StatusBox variant="neutral">
        Simulation only — read-only preview of {simulationMode}
      </StatusBox>

      <div style={grid}>
        <div style={card}>
          <h4 style={cardTitle}>Growth / Defensive</h4>
          <p style={metric}>
            Growth: {simulation.growthDefensiveBefore.growthTotal}% →{' '}
            {simulation.growthDefensiveAfter.growthTotal}%
          </p>
          <p style={metric}>
            Defensive: {simulation.growthDefensiveBefore.defensiveTotal}% →{' '}
            {simulation.growthDefensiveAfter.defensiveTotal}%
          </p>
        </div>

        <GovernanceSummaryCard
          title="Governance impact"
          before={simulation.warningSummaryBefore}
          after={simulation.warningSummaryAfter}
        />
      </div>

      <h4 style={sectionTitle}>Original allocations</h4>
      <AllocationTable allocations={simulation.originalAllocations} />

      <h4 style={sectionTitle}>Simulated allocations</h4>
      <AllocationTable allocations={simulation.simulatedAllocations} />

      {simulation.allocationDifferences.length > 0 ? (
        <>
          <h4 style={sectionTitle}>Allocation differences</h4>
          <table style={table}>
            <thead>
              <tr>
                <th style={tableHeader}>Asset Class</th>
                <th style={tableHeader}>Original</th>
                <th style={tableHeader}>Simulated</th>
                <th style={tableHeader}>Delta</th>
              </tr>
            </thead>
            <tbody>
              {simulation.allocationDifferences.map((diff) => (
                <tr key={diff.assetClass}>
                  <td style={tableCell}>{diff.assetClass}</td>
                  <td style={tableCell}>{diff.originalWeight}%</td>
                  <td style={tableCell}>{diff.simulatedWeight}%</td>
                  <td style={tableCell}>
                    {diff.weightDelta > 0 ? '+' : ''}
                    {diff.weightDelta}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <StatusBox variant="success">No allocation weight changes</StatusBox>
      )}

      <p style={timestamp}>
        Simulated at:{' '}
        {new Date(simulation.metadata.timestamp).toLocaleString()}
        {simulation.metadata.simulationApplied
          ? ' · changes would apply'
          : ' · no effective changes'}
      </p>
    </div>
  );
}

function AllocationTable({
  allocations,
}: {
  allocations: { asset_class: string; final_weight: number }[];
}) {
  return (
    <table style={table}>
      <thead>
        <tr>
          <th style={tableHeader}>Asset Class</th>
          <th style={tableHeader}>Weight</th>
        </tr>
      </thead>
      <tbody>
        {allocations.map((allocation) => (
          <tr key={allocation.asset_class}>
            <td style={tableCell}>{allocation.asset_class}</td>
            <td style={tableCell}>{allocation.final_weight}%</td>
          </tr>
        ))}
      </tbody>
    </table>
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

const sectionTitle = {
  margin: '20px 0 12px 0',
  fontSize: '16px',
  fontWeight: 600,
};

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '16px',
  marginBottom: '8px',
};

const card = {
  padding: '16px',
  background: '#12345b',
  borderRadius: '12px',
  border: '1px solid #2d4a6b',
};

const cardTitle = {
  margin: '0 0 12px 0',
  fontSize: '15px',
  fontWeight: 600,
};

const metric = {
  margin: '0 0 8px 0',
  fontSize: '14px',
};

const list = {
  margin: 0,
  paddingLeft: '20px',
  fontSize: '14px',
  lineHeight: 1.6,
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  marginBottom: '16px',
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

const timestamp = {
  margin: '8px 0 0 0',
  fontSize: '14px',
  color: '#94a3b8',
};
