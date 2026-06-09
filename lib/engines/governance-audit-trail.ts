import type {
  GovernanceAuditAction,
  GovernanceAuditArea,
  GovernanceAuditEntry,
  GovernanceAuditTrailInput,
  GovernanceAuditTrailResult,
} from '../../domain/types/governance-audit';

/** Stable mock audit entries for local governance trail preview. */
export const MOCK_GOVERNANCE_AUDIT_ENTRIES: GovernanceAuditEntry[] = [
  {
    id: 'audit-infra-accepted',
    timestamp: '2026-06-08T14:30:00.000Z',
    area: 'Fund Review',
    action: 'accepted',
    actor: 'J. Mitchell',
    subject: 'Infrastructure Fund',
    summary: 'Adviser accepted retain-current recommendation after committee review.',
    rationale: 'Fund remains best-in-class on cost and risk metrics for the asset class.',
    relatedEntityId: 'fr-infrastructure',
  },
  {
    id: 'audit-global-quality-research',
    timestamp: '2026-06-07T11:15:00.000Z',
    area: 'Fund Review',
    action: 'research_requested',
    actor: 'S. Nguyen',
    subject: 'Global Quality Fund',
    summary: 'Additional manager due diligence requested before alternative review.',
    rationale: 'Need updated ESG and capacity analysis on the proposed alternative.',
    relatedEntityId: 'fr-global-quality',
  },
  {
    id: 'audit-private-credit-deferred',
    timestamp: '2026-06-05T09:00:00.000Z',
    area: 'Fund Review',
    action: 'deferred',
    actor: 'A. Patel',
    subject: 'Private Credit Fund',
    summary: 'Fund review deferred pending updated liquidity stress testing.',
    rationale: 'Awaiting Q2 liquidity report from the manager.',
    relatedEntityId: 'fr-private-credit',
  },
  {
    id: 'audit-scenario-simulation',
    timestamp: '2026-06-04T16:45:00.000Z',
    area: 'Portfolio Scenario',
    action: 'simulation_run',
    actor: 'J. Mitchell',
    subject: 'Balanced — tactical overlay preview',
    summary: 'Portfolio simulation run with proposed Australian Equities overweight.',
    relatedEntityId: 'scenario-balanced-draft',
  },
  {
    id: 'audit-guardrail-warning',
    timestamp: '2026-06-03T10:20:00.000Z',
    area: 'Guardrail',
    action: 'warning_flagged',
    actor: 'System',
    subject: 'Growth allocation guardrail',
    summary: 'Soft guardrail warning raised for growth assets above profile tolerance.',
    relatedEntityId: 'guardrail-growth-tolerance',
  },
  {
    id: 'audit-overlay-expiry',
    timestamp: '2026-06-02T08:00:00.000Z',
    area: 'Tactical Overlay',
    action: 'warning_flagged',
    actor: 'System',
    subject: 'International Equities overlay',
    summary: 'Tactical overlay expiry date within 30 days — review required.',
    relatedEntityId: 'overlay-intl-equities',
  },
  {
    id: 'audit-house-view-published',
    timestamp: '2026-06-01T13:00:00.000Z',
    area: 'House View',
    action: 'updated',
    actor: 'Investment Committee',
    subject: 'Australian Equities',
    summary: 'House view updated to Positive with refreshed supporting rationale.',
    relatedEntityId: 'hv-australian-equities',
  },
  {
    id: 'audit-scenario-approved',
    timestamp: '2026-05-28T15:30:00.000Z',
    area: 'Approval',
    action: 'approved',
    actor: 'S. Nguyen',
    subject: 'Growth — reset to strategic allocation',
    summary: 'Adviser approved reset-to-strategic simulation for client implementation prep.',
    rationale: 'Client agreed to remove expired tactical overlays at next rebalance.',
    relatedEntityId: 'scenario-growth-approved',
  },
];

function compareEntriesNewestFirst(
  a: GovernanceAuditEntry,
  b: GovernanceAuditEntry
): number {
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
}

export function getMockGovernanceAuditEntries(): GovernanceAuditEntry[] {
  return MOCK_GOVERNANCE_AUDIT_ENTRIES;
}

export function formatGovernanceAuditArea(area: GovernanceAuditArea): string {
  return area;
}

export function formatGovernanceAuditAction(action: GovernanceAuditAction): string {
  switch (action) {
    case 'created':
      return 'Created';
    case 'updated':
      return 'Updated';
    case 'accepted':
      return 'Accepted';
    case 'rejected':
      return 'Rejected';
    case 'deferred':
      return 'Deferred';
    case 'research_requested':
      return 'Research requested';
    case 'approved':
      return 'Approved';
    case 'warning_flagged':
      return 'Warning flagged';
    case 'simulation_run':
      return 'Simulation run';
  }
}

/**
 * Builds a read-only governance audit trail view from audit entries.
 * Does not mutate the input array.
 */
export function analyzeGovernanceAuditTrail({
  entries,
}: GovernanceAuditTrailInput): GovernanceAuditTrailResult {
  const sortedEntries = [...entries].sort(compareEntriesNewestFirst);

  return {
    sortedEntries,
    summary: {
      totalEntries: sortedEntries.length,
      fundReviewEvents: sortedEntries.filter((entry) => entry.area === 'Fund Review')
        .length,
      portfolioScenarioEvents: sortedEntries.filter(
        (entry) => entry.area === 'Portfolio Scenario'
      ).length,
      approvalEvents: sortedEntries.filter((entry) => entry.area === 'Approval')
        .length,
      guardrailEvents: sortedEntries.filter(
        (entry) =>
          entry.area === 'Guardrail' || entry.area === 'Tactical Overlay'
      ).length,
    },
  };
}
