import type {
  AllocationWithOverlay,
  StrategicAllocation,
  TacticalOverlay,
} from './allocation';
import type { GuardrailWarning } from './guardrails';
import type { TacticalOverlayDateWarning } from './overlay-governance';

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

/** Guardrail-derived counts shared by portfolio state and simulation engines. */
export type PortfolioGovernanceSummary = Pick<
  PortfolioState,
  'hasHardBreaches' | 'approvalRequired' | 'warningCount' | 'errorCount'
>;

/** Minimal portfolio slice required by the guardrail engine. */
export type PortfolioGuardrailInput = Pick<
  PortfolioState,
  'adjustedAllocations'
>;
