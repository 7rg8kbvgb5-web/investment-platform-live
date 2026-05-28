import type { PortfolioGuardrailInput } from '../../domain/types/portfolio';
import type { GuardrailLevel, GuardrailWarning } from '../../domain/types/guardrails';

/** Soft breaches (e.g. min/max band drift) — surfaced as warnings. */
const SOFT_GUARDRAIL_LEVEL: GuardrailLevel = 'warning';

/** Hard breaches (e.g. regulatory ceilings) — surfaced as errors. */
const HARD_GUARDRAIL_LEVEL: GuardrailLevel = 'error';

function parseWeight(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function checkSoftMinMaxBreaches(
  portfolioState: PortfolioGuardrailInput
): GuardrailWarning[] {
  const warnings: GuardrailWarning[] = [];

  for (const allocation of portfolioState.adjustedAllocations) {
    const currentWeight = allocation.final_weight;
    const minWeight = parseWeight(allocation.min_weight);
    const maxWeight = parseWeight(allocation.max_weight);

    if (minWeight !== null && currentWeight < minWeight) {
      warnings.push({
        level: SOFT_GUARDRAIL_LEVEL,
        message: `${allocation.asset_class} weight ${currentWeight}% is below minimum ${minWeight}%`,
        assetClass: allocation.asset_class,
        currentWeight,
        minWeight,
        maxWeight: maxWeight ?? undefined,
      });
    }

    if (maxWeight !== null && currentWeight > maxWeight) {
      warnings.push({
        level: SOFT_GUARDRAIL_LEVEL,
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

function checkHardLimitBreaches(
  _portfolioState: PortfolioGuardrailInput
): GuardrailWarning[] {
  // Reserved for future hard-limit rules (e.g. regulatory caps, absolute ceilings).
  // Return warnings with level: HARD_GUARDRAIL_LEVEL when implemented.
  void HARD_GUARDRAIL_LEVEL;
  return [];
}

export function checkPortfolioGuardrails(
  portfolioState: PortfolioGuardrailInput
): GuardrailWarning[] {
  return [
    ...checkSoftMinMaxBreaches(portfolioState),
    ...checkHardLimitBreaches(portfolioState),
  ];
}
