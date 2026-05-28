import type {
  AllocationWithOverlay,
  StrategicAllocation,
  TacticalOverlay,
} from '../../domain/types/allocation';
import type { PortfolioGovernanceSummary } from '../../domain/types/portfolio';
import type { GrowthDefensiveTotals } from './calculate-growth-defensive-totals';
import { buildPortfolioState } from './build-portfolio-state';
import { resetToStrategicAllocation } from './reset-to-strategic-allocation';

export type AllocationDifference = {
  assetClass: string;
  originalWeight: number;
  simulatedWeight: number;
  weightDelta: number;
};

export type SimulatePortfolioChangesInput = {
  riskProfileName: string;
  strategicAllocations: StrategicAllocation[];
  currentTacticalOverlays?: TacticalOverlay[];
  proposedTacticalOverlays?: TacticalOverlay[];
  resetToStrategic?: boolean;
};

export type SimulatePortfolioChangesMetadata = {
  simulationApplied: boolean;
  timestamp: string;
};

export type SimulatePortfolioChangesResult = {
  originalAllocations: AllocationWithOverlay[];
  simulatedAllocations: AllocationWithOverlay[];
  allocationDifferences: AllocationDifference[];
  growthDefensiveBefore: GrowthDefensiveTotals;
  growthDefensiveAfter: GrowthDefensiveTotals;
  warningSummaryBefore: PortfolioGovernanceSummary;
  warningSummaryAfter: PortfolioGovernanceSummary;
  metadata: SimulatePortfolioChangesMetadata;
};

function filterByRiskProfile<T extends { risk_profile: string }>(
  items: T[],
  riskProfileName: string
): T[] {
  return items.filter((item) => item.risk_profile === riskProfileName);
}

function toGovernanceSummary(state: {
  hasHardBreaches: boolean;
  approvalRequired: boolean;
  warningCount: number;
  errorCount: number;
}): PortfolioGovernanceSummary {
  return {
    hasHardBreaches: state.hasHardBreaches,
    approvalRequired: state.approvalRequired,
    warningCount: state.warningCount,
    errorCount: state.errorCount,
  };
}

function resolveSimulatedOverlays(
  input: SimulatePortfolioChangesInput
): TacticalOverlay[] {
  const {
    riskProfileName,
    strategicAllocations,
    currentTacticalOverlays = [],
    proposedTacticalOverlays,
    resetToStrategic,
  } = input;

  if (resetToStrategic) {
    return currentTacticalOverlays.filter(
      (overlay) => overlay.risk_profile !== riskProfileName
    );
  }

  if (proposedTacticalOverlays !== undefined) {
    return proposedTacticalOverlays;
  }

  return currentTacticalOverlays;
}

function buildAllocationDifferences(
  originalAllocations: AllocationWithOverlay[],
  simulatedAllocations: AllocationWithOverlay[]
): AllocationDifference[] {
  const simulatedByAsset = new Map(
    simulatedAllocations.map((allocation) => [
      allocation.asset_class,
      allocation.final_weight,
    ])
  );

  const differences: AllocationDifference[] = [];

  for (const allocation of originalAllocations) {
    const simulatedWeight =
      simulatedByAsset.get(allocation.asset_class) ?? allocation.final_weight;
    const weightDelta = simulatedWeight - allocation.final_weight;

    if (weightDelta !== 0) {
      differences.push({
        assetClass: allocation.asset_class,
        originalWeight: allocation.final_weight,
        simulatedWeight,
        weightDelta,
      });
    }
  }

  for (const allocation of simulatedAllocations) {
    if (
      !originalAllocations.some(
        (original) => original.asset_class === allocation.asset_class
      )
    ) {
      differences.push({
        assetClass: allocation.asset_class,
        originalWeight: 0,
        simulatedWeight: allocation.final_weight,
        weightDelta: allocation.final_weight,
      });
    }
  }

  return differences;
}

export function simulatePortfolioChanges(
  input: SimulatePortfolioChangesInput
): SimulatePortfolioChangesResult {
  const {
    riskProfileName,
    strategicAllocations,
    currentTacticalOverlays = [],
    resetToStrategic,
  } = input;

  const currentState = buildPortfolioState({
    riskProfileName,
    strategicAllocations,
    tacticalOverlays: currentTacticalOverlays,
  });

  const simulatedOverlays = resolveSimulatedOverlays(input);

  const simulatedState = buildPortfolioState({
    riskProfileName,
    strategicAllocations,
    tacticalOverlays: simulatedOverlays,
  });

  const allocationDifferences = buildAllocationDifferences(
    currentState.adjustedAllocations,
    simulatedState.adjustedAllocations
  );

  const resetMetadata = resetToStrategic
    ? resetToStrategicAllocation({
        strategicAllocations: filterByRiskProfile(
          strategicAllocations,
          riskProfileName
        ),
        tacticalOverlays: filterByRiskProfile(
          currentTacticalOverlays,
          riskProfileName
        ),
      }).metadata
    : null;

  const simulationApplied =
    allocationDifferences.length > 0 || resetMetadata?.resetApplied === true;

  return {
    originalAllocations: currentState.adjustedAllocations,
    simulatedAllocations: simulatedState.adjustedAllocations,
    allocationDifferences,
    growthDefensiveBefore: {
      growthTotal: currentState.growthTotal,
      defensiveTotal: currentState.defensiveTotal,
    },
    growthDefensiveAfter: {
      growthTotal: simulatedState.growthTotal,
      defensiveTotal: simulatedState.defensiveTotal,
    },
    warningSummaryBefore: toGovernanceSummary(currentState),
    warningSummaryAfter: toGovernanceSummary(simulatedState),
    metadata: {
      simulationApplied,
      timestamp: new Date().toISOString(),
    },
  };
}
