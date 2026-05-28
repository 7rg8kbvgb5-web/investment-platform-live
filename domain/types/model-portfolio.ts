import type { StrategicAllocation } from './allocation';

/** Allocation row within a model portfolio (reuses strategic allocation shape). */
export type ModelPortfolioAllocationRow = StrategicAllocation;

export type ModelPortfolio = {
  modelName: string;
  riskProfile: string;
  allocationRows: ModelPortfolioAllocationRow[];
  version: string;
  createdDate: string;
};

export function buildModelPortfolioFromStrategic({
  riskProfileName,
  strategicAllocations,
  modelName,
  version = '1.0',
  createdDate,
}: {
  riskProfileName: string;
  strategicAllocations: StrategicAllocation[];
  modelName?: string;
  version?: string;
  createdDate?: string;
}): ModelPortfolio {
  const allocationRows = strategicAllocations.filter(
    (allocation) => allocation.risk_profile === riskProfileName
  );

  return {
    modelName: modelName ?? `${riskProfileName} Strategic Model`,
    riskProfile: riskProfileName,
    allocationRows,
    version,
    createdDate: createdDate ?? new Date().toISOString().slice(0, 10),
  };
}
