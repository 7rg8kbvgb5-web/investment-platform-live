import { analyseClientPortfolio } from "./client-portfolio-analysis";
import { generateClientRebalanceRecommendations } from "./client-rebalance-recommendations";

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

function formatTradeSummary() {
  const recommendations = generateClientRebalanceRecommendations();

  return recommendations
    .filter((recommendation) => recommendation.action !== "hold")
    .map((recommendation) => {
      const action = recommendation.action.toUpperCase();
      const change =
        recommendation.changeWeight > 0
          ? `+${recommendation.changeWeight}%`
          : `${recommendation.changeWeight}%`;

      return `${action} ${recommendation.ticker}: ${change} target adjustment`;
    })
    .join("\n");
}

function formatGapSummary() {
  const analysis = analyseClientPortfolio();

  return analysis.gaps
    .slice(0, 6)
    .map((gap) => `• ${gap.title}: ${gap.recommendation}`)
    .join("\n");
}

export function generateInvestmentProposal(): InvestmentProposal {
  const analysis = analyseClientPortfolio();
  const tradeSummary = formatTradeSummary();
  const gapSummary = formatGapSummary();

  return {
    clientName: analysis.clientName,
    modelName: analysis.modelName,
    alignmentScore: analysis.alignmentScore,
    status: analysis.status,
    sections: [
      {
        id: "summary",
        title: "Proposal Summary",
        content:
          `The client portfolio has been reviewed against the approved ${analysis.modelName}. ` +
          `The current alignment score is ${analysis.alignmentScore}/100, indicating ${analysis.status.replaceAll(
            "-",
            " "
          )}. The proposed changes are designed to improve alignment with the approved model portfolio while reducing unintended sector and security-level risks.`,
      },
      {
        id: "portfolio-gaps",
        title: "Key Portfolio Gaps",
        content: gapSummary,
      },
      {
        id: "recommended-trades",
        title: "Recommended Portfolio Changes",
        content: tradeSummary,
      },
      {
        id: "investment-rationale",
        title: "Investment Rationale",
        content:
          "The recommended changes seek to reduce portfolio drift, improve exposure to approved model holdings, and replace non-model holdings with securities supported by the current investment framework.",
      },
      {
        id: "expected-benefits",
        title: "Expected Benefits",
        content:
          "Expected benefits include improved model alignment, stronger consistency with approved house views, clearer sector balance, and a more repeatable portfolio construction process.",
      },
      {
        id: "adviser-note",
        title: "Adviser Review Note",
        content:
          "This proposal output is intended as a first-draft adviser review tool. Final recommendations should consider client objectives, tax consequences, transaction costs, income requirements, and suitability before implementation.",
      },
    ],
  };
}