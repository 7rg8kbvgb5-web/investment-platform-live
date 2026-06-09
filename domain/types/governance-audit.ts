export type GovernanceAuditArea =
  | 'Fund Review'
  | 'Portfolio Scenario'
  | 'Tactical Overlay'
  | 'Guardrail'
  | 'Approval'
  | 'House View';

export type GovernanceAuditAction =
  | 'created'
  | 'updated'
  | 'accepted'
  | 'rejected'
  | 'deferred'
  | 'research_requested'
  | 'approved'
  | 'warning_flagged'
  | 'simulation_run';

export type GovernanceAuditEntry = {
  id: string;
  timestamp: string;
  area: GovernanceAuditArea;
  action: GovernanceAuditAction;
  actor: string;
  subject: string;
  summary: string;
  rationale?: string | null;
  relatedEntityId?: string | null;
};

export type GovernanceAuditTrailInput = {
  entries: GovernanceAuditEntry[];
};

export type GovernanceAuditTrailResult = {
  sortedEntries: GovernanceAuditEntry[];
  summary: {
    totalEntries: number;
    fundReviewEvents: number;
    portfolioScenarioEvents: number;
    approvalEvents: number;
    guardrailEvents: number;
  };
};
