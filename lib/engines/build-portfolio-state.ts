import type {
  AllocationWithOverlay,
  StrategicAllocation,
  TacticalOverlay,
} from '../../domain/types/allocation';
import { applyTacticalOverlays } from './apply-tactical-overlays';
import { calculateGrowthDefensiveTotals } from './calculate-growth-defensive-totals';
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
};

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

  return {
    adjustedAllocations: profileAllocations,
    totalWeight,
    growthTotal,
    defensiveTotal,
    status,
  };
}
