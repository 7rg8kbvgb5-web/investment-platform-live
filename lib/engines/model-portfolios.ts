export type RiskProfile =
  | "Conservative"
  | "Moderate"
  | "Balanced"
  | "Growth"
  | "High Growth";

export type AssetClassType = "Growth" | "Defensive";

export type ModelHolding = {
  code: string;
  name: string;
  sector?: string;
  weight: number;
  rationale: string;
};

export type ModelAssetClass = {
  name: string;
  type: AssetClassType;
  targetWeight: number;
  description: string;
  holdings: ModelHolding[];
};

export type ModelPortfolio = {
  riskProfile: RiskProfile;
  objective: string;
  growthWeight: number;
  defensiveWeight: number;
  assetClasses: ModelAssetClass[];
};

const australianEquities = (weight: number): ModelAssetClass => ({
  name: "Australian Equities",
  type: "Growth",
  targetWeight: weight,
  description:
    "Direct Australian equities selected through the house view, sector positioning and security ranking process.",
  holdings: [
    { code: "CBA", name: "Commonwealth Bank", sector: "Financials", weight: weight * 0.22, rationale: "Core financials exposure." },
    { code: "MQG", name: "Macquarie Group", sector: "Financials", weight: weight * 0.16, rationale: "Diversified financial exposure." },
    { code: "BHP", name: "BHP Group", sector: "Materials", weight: weight * 0.22, rationale: "Core resources exposure." },
    { code: "CSL", name: "CSL Limited", sector: "Healthcare", weight: weight * 0.16, rationale: "Quality healthcare exposure." },
    { code: "WES", name: "Wesfarmers", sector: "Consumer Discretionary", weight: weight * 0.12, rationale: "Diversified consumer exposure." },
    { code: "TCL", name: "Transurban", sector: "Industrials", weight: weight * 0.12, rationale: "Infrastructure-style listed equity exposure." },
  ],
});

const internationalEquities = (weight: number): ModelAssetClass => ({
  name: "International Equities",
  type: "Growth",
  targetWeight: weight,
  description:
    "International equity exposure used to diversify sector, currency and geographic risk.",
  holdings: [
    { code: "QUAL", name: "VanEck MSCI International Quality ETF", weight: weight * 0.45, rationale: "Quality-focused global equity exposure." },
    { code: "IVV", name: "iShares S&P 500 ETF", weight: weight * 0.35, rationale: "Broad US large-cap exposure." },
    { code: "Global Fund", name: "Active Global Equity Fund", weight: weight * 0.2, rationale: "Active global equity exposure." },
  ],
});

const propertyInfrastructure = (weight: number): ModelAssetClass => ({
  name: "Listed Property / Infrastructure",
  type: "Growth",
  targetWeight: weight,
  description:
    "Real asset exposure providing diversification, income and inflation sensitivity.",
  holdings: [
    { code: "VAP", name: "Australian Property Securities ETF", weight: weight * 0.55, rationale: "Diversified listed property exposure." },
    { code: "IFRA", name: "Global Infrastructure ETF", weight: weight * 0.45, rationale: "Global infrastructure exposure." },
  ],
});

const alternatives = (weight: number): ModelAssetClass => ({
  name: "Alternatives",
  type: "Growth",
  targetWeight: weight,
  description:
    "Alternative investments used selectively to improve diversification and broaden return sources.",
  holdings: [
    { code: "Alt Fund", name: "Diversified Alternatives Fund", weight, rationale: "Diversified non-traditional return exposure." },
  ],
});

const australianFixedInterest = (weight: number): ModelAssetClass => ({
  name: "Australian Fixed Interest",
  type: "Defensive",
  targetWeight: weight,
  description:
    "Domestic fixed-income exposure focused on income, capital stability and liquidity.",
  holdings: [
    { code: "Direct Bonds", name: "Australian Corporate Bond Portfolio", weight: weight * 0.7, rationale: "Direct bond exposure tailored to yield, maturity and credit quality." },
    { code: "IAF", name: "iShares Core Composite Bond ETF", weight: weight * 0.3, rationale: "Diversified Australian bond exposure." },
  ],
});

const globalFixedInterest = (weight: number): ModelAssetClass => ({
  name: "Global Fixed Interest",
  type: "Defensive",
  targetWeight: weight,
  description:
    "Global fixed-income exposure for diversification across regions, issuers and interest-rate cycles.",
  holdings: [
    { code: "IHCB", name: "Global Corporate Bond ETF", weight: weight * 0.6, rationale: "Global investment-grade credit exposure." },
    { code: "Global Bond Fund", name: "Active Global Bond Fund", weight: weight * 0.4, rationale: "Active duration and credit management." },
  ],
});

const cash = (weight: number): ModelAssetClass => ({
  name: "Cash",
  type: "Defensive",
  targetWeight: weight,
  description:
    "Liquidity reserve for flexibility, income needs and tactical opportunities.",
  holdings: [
    { code: "Cash", name: "Cash / At Call Account", weight, rationale: "Liquidity, optionality and short-term capital stability." },
  ],
});

export const modelPortfolios: ModelPortfolio[] = [
  {
    riskProfile: "Conservative",
    objective: "Designed for investors prioritising capital stability, liquidity and income, with modest exposure to growth assets.",
    growthWeight: 30,
    defensiveWeight: 70,
    assetClasses: [
      australianEquities(12),
      internationalEquities(10),
      propertyInfrastructure(5),
      alternatives(3),
      australianFixedInterest(35),
      globalFixedInterest(25),
      cash(10),
    ],
  },
  {
    riskProfile: "Moderate",
    objective: "Designed for investors seeking moderate growth while retaining a meaningful allocation to defensive assets.",
    growthWeight: 45,
    defensiveWeight: 55,
    assetClasses: [
      australianEquities(20),
      internationalEquities(17),
      propertyInfrastructure(5),
      alternatives(3),
      australianFixedInterest(28),
      globalFixedInterest(18),
      cash(9),
    ],
  },
  {
    riskProfile: "Balanced",
    objective: "Designed for investors seeking a balance between long-term capital growth, income generation and downside risk management.",
    growthWeight: 60,
    defensiveWeight: 40,
    assetClasses: [
      australianEquities(30),
      internationalEquities(25),
      propertyInfrastructure(3),
      alternatives(2),
      australianFixedInterest(20),
      globalFixedInterest(12),
      cash(8),
    ],
  },
  {
    riskProfile: "Growth",
    objective: "Designed for investors seeking long-term capital growth, with a higher allocation to growth assets and tolerance for market volatility.",
    growthWeight: 75,
    defensiveWeight: 25,
    assetClasses: [
      australianEquities(38),
      internationalEquities(30),
      propertyInfrastructure(4),
      alternatives(3),
      australianFixedInterest(12),
      globalFixedInterest(8),
      cash(5),
    ],
  },
  {
    riskProfile: "High Growth",
    objective: "Designed for investors with a long investment timeframe seeking maximum long-term growth and a high tolerance for volatility.",
    growthWeight: 90,
    defensiveWeight: 10,
    assetClasses: [
      australianEquities(45),
      internationalEquities(38),
      propertyInfrastructure(4),
      alternatives(3),
      australianFixedInterest(5),
      globalFixedInterest(3),
      cash(2),
    ],
  },
];

export function getModelPortfolioByRiskProfile(
  riskProfile: RiskProfile
): ModelPortfolio {
  return (
    modelPortfolios.find((item) => item.riskProfile === riskProfile) ??
    modelPortfolios[2]
  );
}

export function getAssetClassTotal(portfolio: ModelPortfolio): number {
  return portfolio.assetClasses.reduce(
    (total, assetClass) => total + assetClass.targetWeight,
    0
  );
}

export function getHoldingTotal(portfolio: ModelPortfolio): number {
  return portfolio.assetClasses.reduce((total, assetClass) => {
    return (
      total +
      assetClass.holdings.reduce(
        (holdingTotal, holding) => holdingTotal + holding.weight,
        0
      )
    );
  }, 0);
}

export function formatWeight(weight: number): string {
  return `${Number(weight.toFixed(2))}%`;
}