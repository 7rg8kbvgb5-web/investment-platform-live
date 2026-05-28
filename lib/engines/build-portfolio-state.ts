import type {
  AllocationWithOverlay,
  StrategicAllocation,
  TacticalOverlay,
} from '../../domain/types/allocation';
import { applyTacticalOverlays } from './apply-tactical-overlays';
import { calculateGrowthDefensiveTotals } from './calculate-growth-defensive-totals';
import {
  checkPortfolioGuardrails,
  type GuardrailWarning,
} from './check-portfolio-guardrails';
import {
  checkTacticalOverlayDates,
  type TacticalOverlayDateWarning,
} from './check-tactical-overlay-dates';
import { validateAllocationTotal } from './validate-allocation-total';

export type BuildPortfolioStateInput = {
  riskProfileName: string;
  strategicAllocations: StrategicAllocation[];
  tacticalOverlays?: TacticalOverlay[];
};

export type PortfolioState = {
  adjustedAllocations: AllocationWithOverlay[];
  totalWeight: number;
  growthTotal: number;
  defensiveTotal: number;
  status: 'Valid' | 'Check allocation';
  guardrailWarnings: GuardrailWarning[];
  tacticalOverlayDateWarnings: TacticalOverlayDateWarning[];
  hasHardBreaches: boolean;
  approvalRequired: boolean;
  warningCount: number;
  errorCount: number;
};

type GuardrailWarningWithGovernance = GuardrailWarning & {
  breachType?: 'soft' | 'hard';
  requiresApproval?: boolean;
};

function deriveGovernanceSummaries(
  guardrailWarnings: GuardrailWarningWithGovernance[]
): Pick<
  PortfolioState,
  'hasHardBreaches' | 'approvalRequired' | 'warningCount' | 'errorCount'
> {
  return {
    hasHardBreaches: guardrailWarnings.some(
      (warning) => warning.breachType === 'hard'
    ),
    approvalRequired: guardrailWarnings.some(
      (warning) => warning.requiresApproval === true
    ),
    warningCount: guardrailWarnings.filter(
      (warning) => warning.level === 'warning'
    ).length,
    errorCount: guardrailWarnings.filter((warning) => warning.level === 'error')
      .length,
  };
}

export function buildPortfolioState({
  riskProfileName,
  strategicAllocations,
  tacticalOverlays = [],
}: BuildPortfolioStateInput): PortfolioState {
  const profileAllocations = applyTacticalOverlays(
    strategicAllocations.filter(
      (allocation) => allocation.risk_profile === riskProfileName
    ),
    tacticalOverlays
  );

  const { totalWeight, status } = validateAllocationTotal(profileAllocations);
  const { growthTotal, defensiveTotal } =
    calculateGrowthDefensiveTotals(profileAllocations);

  const portfolioState = {
    adjustedAllocations: profileAllocations,
    totalWeight,
    growthTotal,
    defensiveTotal,
    status,
  };

  const guardrailWarnings = checkPortfolioGuardrails({
    ...portfolioState,
    guardrailWarnings: [],
    tacticalOverlayDateWarnings: [],
    hasHardBreaches: false,
    approvalRequired: false,
    warningCount: 0,
    errorCount: 0,
  });

  const tacticalOverlayDateWarnings = checkTacticalOverlayDates(tacticalOverlays);

  return {
    ...portfolioState,
    guardrailWarnings,
    tacticalOverlayDateWarnings,
    ...deriveGovernanceSummaries(guardrailWarnings),
  };
}
