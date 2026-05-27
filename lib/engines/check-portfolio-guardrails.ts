import type { PortfolioState } from './build-portfolio-state';

export type GuardrailLevel = 'warning' | 'error';

export type GuardrailWarning = {
  level: GuardrailLevel;
  message: string;
  assetClass?: string;
  currentWeight?: number;
  minWeight?: number;
  maxWeight?: number;
};

function parseWeight(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function checkPortfolioGuardrails(
  portfolioState: PortfolioState
): GuardrailWarning[] {
  const warnings: GuardrailWarning[] = [];

  for (const allocation of portfolioState.adjustedAllocations) {
    const currentWeight = allocation.final_weight;
    const minWeight = parseWeight(allocation.min_weight);
    const maxWeight = parseWeight(allocation.max_weight);

    if (minWeight !== null && currentWeight < minWeight) {
      warnings.push({
        level: 'error',
        message: `${allocation.asset_class} weight ${currentWeight}% is below minimum ${minWeight}%`,
        assetClass: allocation.asset_class,
        currentWeight,
        minWeight,
        maxWeight: maxWeight ?? undefined,
      });
    }

    if (maxWeight !== null && currentWeight > maxWeight) {
      warnings.push({
        level: 'error',
        message: `${allocation.asset_class} weight ${currentWeight}% exceeds maximum ${maxWeight}%`,
        assetClass: allocation.asset_class,
        currentWeight,
        minWeight: minWeight ?? undefined,
        maxWeight,
      });
    }
  }

  return warnings;
}
