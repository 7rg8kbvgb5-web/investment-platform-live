import type {
  BuildPortfolioStateInput,
  PortfolioState,
} from '../../domain/types/portfolio';
import type { GuardrailWarning } from '../../domain/types/guardrails';
import { applyTacticalOverlays } from './apply-tactical-overlays';
import { calculateGrowthDefensiveTotals } from './calculate-growth-defensive-totals';
import { checkPortfolioGuardrails } from './check-portfolio-guardrails';
import { checkTacticalOverlayDates } from './check-tactical-overlay-dates';
import { validateAllocationTotal } from './validate-allocation-total';

export type { BuildPortfolioStateInput, PortfolioState } from '../../domain/types/portfolio';

function deriveGovernanceSummaries(
  guardrailWarnings: GuardrailWarning[]
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
    adjustedAllocations: profileAllocations,
  });

  const tacticalOverlayDateWarnings = checkTacticalOverlayDates(tacticalOverlays);

  return {
    ...portfolioState,
    guardrailWarnings,
    tacticalOverlayDateWarnings,
    ...deriveGovernanceSummaries(guardrailWarnings),
  };
}
