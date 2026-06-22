import { analyseClientPortfolio } from "./client-portfolio-analysis";
import { generateClientRebalanceRecommendations } from "./client-rebalance-recommendations";
import { buildProposalEvidence } from "./proposal-evidence";

export type ProposalSection = {
  id: string;
  title: string;
  content: string;
};

export type InvestmentProposal = {
  clientName: string;
  modelName: string;
  alignmentScore: number;
  status: string;
  sections: ProposalSection[];
};

function formatStatus(status: string) {
  return status.replaceAll("-", " ");
}

function formatTradeSummary() {
  const recommendations = generateClientRebalanceRecommendations();

  const activeRecommendations = recommendations.filter(
    (recommendation) => recommendation.action !== "hold"
  );

  if (activeRecommendations.length === 0) {
    return "No material security-level changes are currently required.";
  }

  return activeRecommendations
    .map((recommendation) => {
      const action = recommendation.action.toUpperCase();
      const change =
        recommendation.changeWeight > 0
          ? `+${recommendation.changeWeight}%`
          : `${recommendation.changeWeight}%`;

      return `• ${action} ${recommendation.ticker}: ${change} target adjustment. ${recommendation.rationale}`;
    })
    .join("\n");
}

function formatGapSummary() {
  const analysis = analyseClientPortfolio();

  if (analysis.gaps.length === 0) {
    return "No material portfolio gaps have been identified against the approved model.";
  }

  return analysis.gaps
    .slice(0, 8)
    .map((gap) => `• ${gap.title}: ${gap.recommendation}`)
    .join("\n");
}

function formatRiskSummary() {
  const analysis = analyseClientPortfolio();

  const highSeverityGaps = analysis.gaps.filter(
    (gap) => gap.severity === "high"
  );

  const mediumSeverityGaps = analysis.gaps.filter(
    (gap) => gap.severity === "medium"
  );

  if (highSeverityGaps.length === 0 && mediumSeverityGaps.length === 0) {
    return "The portfolio does not currently show material high or medium severity gaps against the approved model.";
  }

  return [
    `High severity gaps identified: ${highSeverityGaps.length}.`,
    `Medium severity gaps identified: ${mediumSeverityGaps.length}.`,
    "The main risks relate to model drift, sector imbalance, non-model holdings, and missing approved model exposures.",
  ].join("\n");
}

function formatImplementationSummary() {
  const recommendations = generateClientRebalanceRecommendations();

  const buys = recommendations.filter(
    (recommendation) => recommendation.action === "buy"
  );

  const sells = recommendations.filter(
    (recommendation) => recommendation.action === "sell"
  );

  const reviews = recommendations.filter(
    (recommendation) => recommendation.action === "review"
  );

  return [
    `Buy recommendations: ${buys.length}.`,
    `Sell recommendations: ${sells.length}.`,
    `Review recommendations: ${reviews.length}.`,
    "Implementation should be staged with consideration for tax outcomes, brokerage, liquidity, client preferences, and any existing advice constraints.",
  ].join("\n");
}

function formatEvidenceSummary() {
  const evidenceItems = buildProposalEvidence();

  if (evidenceItems.length === 0) {
    return "No investment committee evidence has been attached to this proposal.";
  }

  return evidenceItems
    .map(
      (evidence) =>
        `• ${evidence.security}: House View ${evidence.houseView}, Sector Health Score ${evidence.sectorHealthScore}/100, Security Ranking ${evidence.securityRanking}/100. ${evidence.rationale}`
    )
    .join("\n");
}

export function generateInvestmentProposal(): InvestmentProposal {
  const analysis = analyseClientPortfolio();
  const tradeSummary = formatTradeSummary();
  const gapSummary = formatGapSummary();
  const riskSummary = formatRiskSummary();
  const implementationSummary = formatImplementationSummary();
  const evidenceSummary = formatEvidenceSummary();

  return {
    clientName: analysis.clientName,
    modelName: analysis.modelName,
    alignmentScore: analysis.alignmentScore,
    status: analysis.status,
    sections: [
      {
        id: "executive-summary",
        title: "Executive Summary",
        content:
          `The client portfolio has been reviewed against the approved ${analysis.modelName}. ` +
          `The current portfolio alignment score is ${analysis.alignmentScore}/100, which indicates ${formatStatus(
            analysis.status
          )}. ` +
          "The recommended changes are intended to improve alignment with the approved model portfolio, reduce unintended risks, and provide a clearer basis for adviser review.",
      },
      {
        id: "current-portfolio-review",
        title: "Current Portfolio Review",
        content:
          "The current portfolio has been assessed against approved model holdings and sector exposures. " +
          "The review identifies areas where the portfolio is overweight, underweight, missing preferred model holdings, or retaining positions outside the approved model framework.",
      },
      {
        id: "key-risks",
        title: "Key Risks Identified",
        content: riskSummary,
      },
      {
        id: "portfolio-gaps",
        title: "Key Portfolio Gaps",
        content: gapSummary,
      },
      {
        id: "recommended-changes",
        title: "Recommended Portfolio Changes",
        content: tradeSummary,
      },
      {
        id: "investment-committee-evidence",
        title: "Investment Committee Evidence",
        content: evidenceSummary,
      },
      {
        id: "implementation-summary",
        title: "Implementation Summary",
        content: implementationSummary,
      },
      {
        id: "expected-client-outcomes",
        title: "Expected Client Outcomes",
        content:
          "Expected outcomes include improved model alignment, reduced portfolio drift, clearer sector balance, stronger consistency with approved house views, and a more repeatable basis for future client reviews.",
      },
      {
        id: "adviser-review-note",
        title: "Adviser Review / SOA Note",
        content:
          "This proposal is an adviser review draft and should not be treated as final personal advice without further review. Before implementation, the adviser should consider client objectives, risk profile, tax position, transaction costs, income needs, liquidity requirements, product suitability, and compliance requirements.",
      },
    ],
  };
}