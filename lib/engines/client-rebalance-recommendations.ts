import { analyseClientPortfolio } from "./client-portfolio-analysis";

export type RebalanceAction = "buy" | "sell" | "hold" | "review";

export type ClientRebalanceRecommendation = {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  action: RebalanceAction;
  currentWeight: number;
  targetWeight: number;
  changeWeight: number;
  priority: "low" | "medium" | "high";
  rationale: string;
};

type Holding = {
  ticker: string;
  name: string;
  sector: string;
  weight: number;
};

const clientHoldings: Holding[] = [
  { ticker: "CBA", name: "Commonwealth Bank", sector: "Financials", weight: 14 },
  { ticker: "NAB", name: "National Australia Bank", sector: "Financials", weight: 10 },
  { ticker: "BHP", name: "BHP Group", sector: "Materials", weight: 7 },
  { ticker: "WES", name: "Wesfarmers", sector: "Consumer Discretionary", weight: 4 },
  { ticker: "WOW", name: "Woolworths", sector: "Consumer Staples", weight: 6 },
];

const modelHoldings: Holding[] = [
  { ticker: "MQG", name: "Macquarie Group", sector: "Financials", weight: 7 },
  { ticker: "BHP", name: "BHP Group", sector: "Materials", weight: 8 },
  { ticker: "NST", name: "Northern Star", sector: "Materials", weight: 3.5 },
  { ticker: "CSL", name: "CSL", sector: "Healthcare", weight: 5 },
  { ticker: "WES", name: "Wesfarmers", sector: "Consumer Discretionary", weight: 5 },
];

function getPriority(changeWeight: number): "low" | "medium" | "high" {
  const absoluteChange = Math.abs(changeWeight);

  if (absoluteChange >= 6) return "high";
  if (absoluteChange >= 3) return "medium";
  return "low";
}

function getAction(changeWeight: number): RebalanceAction {
  if (changeWeight > 0.5) return "buy";
  if (changeWeight < -0.5) return "sell";
  return "hold";
}

export function generateClientRebalanceRecommendations(): ClientRebalanceRecommendation[] {
  analyseClientPortfolio();

  const allTickers = Array.from(
    new Set([
      ...clientHoldings.map((holding) => holding.ticker),
      ...modelHoldings.map((holding) => holding.ticker),
    ])
  );

  return allTickers
    .map((ticker) => {
      const clientHolding = clientHoldings.find(
        (holding) => holding.ticker === ticker
      );

      const modelHolding = modelHoldings.find(
        (holding) => holding.ticker === ticker
      );

      const currentWeight = clientHolding?.weight ?? 0;
      const targetWeight = modelHolding?.weight ?? 0;
      const changeWeight = Number((targetWeight - currentWeight).toFixed(1));

      const referenceHolding = modelHolding ?? clientHolding;

      if (!referenceHolding) {
        throw new Error(`Unable to find holding data for ${ticker}`);
      }

      const action = modelHolding ? getAction(changeWeight) : "review";

      return {
        id: `${ticker.toLowerCase()}-rebalance`,
        ticker,
        name: referenceHolding.name,
        sector: referenceHolding.sector,
        action,
        currentWeight,
        targetWeight,
        changeWeight,
        priority: getPriority(changeWeight),
        rationale:
          action === "buy"
            ? `${ticker} is below target model weight or missing from the client portfolio.`
            : action === "sell"
            ? `${ticker} is above target model weight and should be reduced.`
            : action === "review"
            ? `${ticker} is not part of the approved model and should be reviewed as an exception.`
            : `${ticker} is broadly aligned with the model portfolio.`,
      };
    })
    .sort((a, b) => {
      const priorityRank = { high: 3, medium: 2, low: 1 };
      return priorityRank[b.priority] - priorityRank[a.priority];
    });
}