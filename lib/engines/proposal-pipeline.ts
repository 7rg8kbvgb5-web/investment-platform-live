export type ProposalStage =
  | "draft"
  | "adviser-review"
  | "ic-review"
  | "ready-to-present"
  | "implemented";

export type ProposalPipelineItem = {
  id: string;
  clientName: string;
  entityType: string;
  adviser: string;
  stage: ProposalStage;
  portfolioStatus: string;
  lastUpdated: string;
};

export const proposalPipelineItems: ProposalPipelineItem[] = [
  {
    id: "smith-family",
    clientName: "Smith Family",
    entityType: "Family Group",
    adviser: "Sean",
    stage: "draft",
    portfolioStatus: "Rebalance required",
    lastUpdated: "Today",
  },
  {
    id: "jones-smsf",
    clientName: "Jones SMSF",
    entityType: "SMSF",
    adviser: "Louie",
    stage: "ic-review",
    portfolioStatus: "Awaiting approval",
    lastUpdated: "Yesterday",
  },
  {
    id: "brown-trust",
    clientName: "Brown Trust",
    entityType: "Trust",
    adviser: "Sean",
    stage: "ready-to-present",
    portfolioStatus: "Proposal ready",
    lastUpdated: "2 days ago",
  },
  {
    id: "wilson-family",
    clientName: "Wilson Family",
    entityType: "Family Group",
    adviser: "Louie",
    stage: "adviser-review",
    portfolioStatus: "Review required",
    lastUpdated: "3 days ago",
  },
];

export function getProposalStageLabel(stage: ProposalStage) {
  const labels: Record<ProposalStage, string> = {
    draft: "Draft",
    "adviser-review": "Adviser Review",
    "ic-review": "IC Review",
    "ready-to-present": "Ready to Present",
    implemented: "Implemented",
  };

  return labels[stage];
}