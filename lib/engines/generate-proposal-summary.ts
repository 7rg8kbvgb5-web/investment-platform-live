import type { PortfolioGovernanceSummary } from '../../domain/types/portfolio';
import type {
  AllocationDifference,
  SimulatePortfolioChangesResult,
} from './simulate-portfolio-changes';

export type ProposalSummary = {
  headline: string;
  allocationChangesSummary: string;
  growthDefensiveImpactSummary: string;
  governanceSummary: string;
  warningsApprovalSummary: string;
  adviserNotesPlaceholder: string;
};

function formatGovernanceDelta(
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

function buildAllocationChangesSummary(
  differences: AllocationDifference[]
): string {
  if (differences.length === 0) {
    return 'No allocation weight changes in this simulation.';
  }

  const lines = differences.map((diff) => {
    const sign = diff.weightDelta > 0 ? '+' : '';
    return `${diff.assetClass}: ${diff.originalWeight}% → ${diff.simulatedWeight}% (${sign}${diff.weightDelta}%)`;
  });

  return `${differences.length} asset class change${differences.length === 1 ? '' : 's'}:\n${lines.join('\n')}`;
}

function buildGrowthDefensiveSummary(
  simulation: SimulatePortfolioChangesResult
): string {
  const { growthDefensiveBefore, growthDefensiveAfter } = simulation;
  const growthDelta =
    growthDefensiveAfter.growthTotal - growthDefensiveBefore.growthTotal;
  const defensiveDelta =
    growthDefensiveAfter.defensiveTotal - growthDefensiveBefore.defensiveTotal;

  const formatDelta = (delta: number) => {
    if (delta === 0) {
      return 'unchanged';
    }
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta}%`;
  };

  return [
    `Growth assets: ${growthDefensiveBefore.growthTotal}% → ${growthDefensiveAfter.growthTotal}% (${formatDelta(growthDelta)})`,
    `Defensive assets: ${growthDefensiveBefore.defensiveTotal}% → ${growthDefensiveAfter.defensiveTotal}% (${formatDelta(defensiveDelta)})`,
  ].join('\n');
}

function buildGovernanceSummary(
  before: PortfolioGovernanceSummary,
  after: PortfolioGovernanceSummary
): string {
  return [
    formatGovernanceDelta('Warnings', before.warningCount, after.warningCount),
    formatGovernanceDelta('Errors', before.errorCount, after.errorCount),
    formatGovernanceDelta(
      'Approval required',
      before.approvalRequired,
      after.approvalRequired
    ),
    formatGovernanceDelta(
      'Hard breaches',
      before.hasHardBreaches,
      after.hasHardBreaches
    ),
  ].join('\n');
}

function buildWarningsApprovalSummary(
  before: PortfolioGovernanceSummary,
  after: PortfolioGovernanceSummary
): string {
  const parts: string[] = [];

  if (after.warningCount > 0) {
    parts.push(
      `${after.warningCount} warning${after.warningCount === 1 ? '' : 's'} after simulation (was ${before.warningCount}).`
    );
  } else {
    parts.push('No warnings after simulation.');
  }

  if (after.errorCount > 0) {
    parts.push(
      `${after.errorCount} error${after.errorCount === 1 ? '' : 's'} after simulation (was ${before.errorCount}).`
    );
  } else {
    parts.push('No errors after simulation.');
  }

  if (after.approvalRequired) {
    parts.push('Adviser approval would be required before implementation.');
  } else {
    parts.push('No adviser approval flag raised by guardrails.');
  }

  if (after.hasHardBreaches) {
    parts.push('Hard guardrail breaches are present — proposal should not proceed without review.');
  }

  return parts.join(' ');
}

function buildHeadline(simulation: SimulatePortfolioChangesResult): string {
  const { allocationDifferences, metadata } = simulation;

  if (!metadata.simulationApplied) {
    return 'Portfolio simulation: no effective changes detected';
  }

  if (allocationDifferences.length === 0) {
    return 'Portfolio simulation: governance or overlay state would change without allocation deltas';
  }

  return `Portfolio simulation: ${allocationDifferences.length} allocation change${allocationDifferences.length === 1 ? '' : 's'} proposed`;
}

export function generateProposalSummary(
  simulation: SimulatePortfolioChangesResult
): ProposalSummary {
  const { warningSummaryBefore, warningSummaryAfter } = simulation;

  return {
    headline: buildHeadline(simulation),
    allocationChangesSummary: buildAllocationChangesSummary(
      simulation.allocationDifferences
    ),
    growthDefensiveImpactSummary: buildGrowthDefensiveSummary(simulation),
    governanceSummary: buildGovernanceSummary(
      warningSummaryBefore,
      warningSummaryAfter
    ),
    warningsApprovalSummary: buildWarningsApprovalSummary(
      warningSummaryBefore,
      warningSummaryAfter
    ),
    adviserNotesPlaceholder:
      '[Adviser notes: document client objectives, rationale for proposed changes, and any conditions before implementation.]',
  };
}
