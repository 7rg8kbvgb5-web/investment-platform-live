export type ProposalEvidence = {
    security: string;
    houseView: string;
    sectorHealthScore: number;
    securityRanking: number;
    rationale: string;
  };
  
  export function buildProposalEvidence(): ProposalEvidence[] {
    return [
      {
        security: "MQG",
        houseView: "Positive",
        sectorHealthScore: 78,
        securityRanking: 84,
        rationale:
          "Financials remain an overweight sector and MQG ranks highly on quality, earnings momentum and valuation.",
      },
      {
        security: "NST",
        houseView: "Positive",
        sectorHealthScore: 72,
        securityRanking: 81,
        rationale:
          "Materials remain attractive and NST is a preferred exposure within the approved model.",
      },
      {
        security: "CSL",
        houseView: "Positive",
        sectorHealthScore: 68,
        securityRanking: 79,
        rationale:
          "Healthcare provides diversification and CSL remains a core approved holding.",
      },
    ];
  }