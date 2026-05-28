import type { SeverityLevel } from './severity';

export type GuardrailLevel = SeverityLevel;

export type GuardrailBreachType = 'soft' | 'hard';

export type GuardrailWarning = {
  level: GuardrailLevel;
  message: string;
  assetClass?: string;
  currentWeight?: number;
  minWeight?: number;
  maxWeight?: number;
  breachType?: GuardrailBreachType;
  requiresApproval?: boolean;
};
