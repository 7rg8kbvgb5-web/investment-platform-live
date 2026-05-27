import type { StrategicAllocation } from '../../domain/types/allocation';

export type AllocationTotalValidation = {
  totalWeight: number;
  status: 'Valid' | 'Check allocation';
};

export function validateAllocationTotal(
  allocations: Pick<StrategicAllocation, 'target_weight'>[]
): AllocationTotalValidation {
  const totalWeight = allocations.reduce(
    (sum, a) => sum + Number(a.target_weight),
    0
  );

  return {
    totalWeight,
    status: totalWeight === 100 ? 'Valid' : 'Check allocation',
  };
}
