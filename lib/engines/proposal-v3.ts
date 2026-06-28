export type ProposalSectionId =
  | "cover"
  | "executive-summary"
  | "client-objectives"
  | "current-portfolio"
  | "portfolio-health"
  | "allocation-comparison"
  | "recommended-trades"
  | "investment-evidence"
  | "risk-assessment"
  | "implementation-plan"
  | "expected-outcomes"
  | "disclosures"
  | "appendices";

export type ProposalSection = {
  id: ProposalSectionId;
  title: string;
  description: string;
  defaultIncluded: boolean;
  category: "client" | "analysis" | "recommendation" | "governance" | "appendix";
};

export const proposalV3Sections: ProposalSection[] = [
  {
    id: "cover",
    title: "Cover Page",
    description: "Client name, adviser details, proposal date and branding.",
    defaultIncluded: true,
    category: "client",
  },
  {
    id: "executive-summary",
    title: "Executive Summary",
    description: "High-level summary of findings, recommendations and expected outcomes.",
    defaultIncluded: true,
    category: "client",
  },
  {
    id: "client-objectives",
    title: "Client Objectives",
    description: "Client goals, risk profile, income needs and investment preferences.",
    defaultIncluded: true,
    category: "client",
  },
  {
    id: "current-portfolio",
    title: "Current Portfolio Overview",
    description: "Summary of existing holdings, weights, concentration and portfolio structure.",
    defaultIncluded: true,
    category: "analysis",
  },
  {
    id: "portfolio-health",
    title: "Portfolio Health Score",
    description: "Overall assessment of diversification, alignment, concentration and quality.",
    defaultIncluded: true,
    category: "analysis",
  },
  {
    id: "allocation-comparison",
    title: "Current vs Recommended Position",
    description: "Comparison of the client's existing portfolio against the recommended model.",
    defaultIncluded: true,
    category: "analysis",
  },
  {
    id: "recommended-trades",
    title: "Recommended Trades",
    description: "Buy, sell, reduce and increase recommendations with rationale.",
    defaultIncluded: true,
    category: "recommendation",
  },
  {
    id: "investment-evidence",
    title: "Investment Committee Evidence",
    description: "Sector scores, security rankings, house views and approval evidence.",
    defaultIncluded: true,
    category: "governance",
  },
  {
    id: "risk-assessment",
    title: "Risk Assessment",
    description: "Key portfolio risks, concentration risks and implementation considerations.",
    defaultIncluded: true,
    category: "governance",
  },
  {
    id: "implementation-plan",
    title: "Implementation Plan",
    description: "Step-by-step implementation roadmap for the recommended changes.",
    defaultIncluded: true,
    category: "recommendation",
  },
  {
    id: "expected-outcomes",
    title: "Expected Outcomes",
    description: "Expected benefits from the recommended portfolio changes.",
    defaultIncluded: true,
    category: "client",
  },
  {
    id: "disclosures",
    title: "Disclosures",
    description: "Important advice, risk, limitation and compliance disclosures.",
    defaultIncluded: true,
    category: "governance",
  },
  {
    id: "appendices",
    title: "Appendices",
    description: "Detailed supporting tables, scoring methodology and technical evidence.",
    defaultIncluded: false,
    category: "appendix",
  },
];

export function getDefaultProposalSectionIds(): ProposalSectionId[] {
  return proposalV3Sections
    .filter((section) => section.defaultIncluded)
    .map((section) => section.id);
}

export function buildProposalV3(selectedSectionIds: ProposalSectionId[]) {
  const selectedSections = proposalV3Sections.filter((section) =>
    selectedSectionIds.includes(section.id),
  );

  return {
    title: "Investment Proposal",
    version: "V3",
    generatedAt: new Date().toISOString(),
    selectedSections,
    sectionCount: selectedSections.length,
  };
}