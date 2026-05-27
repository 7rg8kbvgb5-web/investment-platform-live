import type { StrategicAllocation } from '../../domain/types/allocation';

export type GrowthDefensiveTotals = {
  growthTotal: number;
  defensiveTotal: number;
};

export function calculateGrowthDefensiveTotals(
  allocations: Pick<StrategicAllocation, 'classification' | 'target_weight'>[]
): GrowthDefensiveTotals {
  const growthTotal = allocations
    .filter((a) => a.classification === 'Growth')
    .reduce((sum, a) => sum + Number(a.target_weight), 0);

  const defensiveTotal = allocations
    .filter((a) => a.classification === 'Defensive')
    .reduce((sum, a) => sum + Number(a.target_weight), 0);

  return { growthTotal, defensiveTotal };
}
