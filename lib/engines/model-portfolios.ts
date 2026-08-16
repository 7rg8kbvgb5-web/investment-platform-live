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
  /** Forward (estimated, current FY) distribution yield, percent. Undefined if not stated. */
  yield?: number;
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Holding weights are computed as fractions of an asset class weight
 * (e.g. weight * 0.22), which routinely produces binary floating-point
 * artifacts like 5.949999999999999 instead of 5.95. Rounding once here,
 * rather than remembering to round in every place that later reads
 * holding.weight, keeps every consumer clean by construction.
 */
function roundPortfolio(portfolio: ModelPortfolio): ModelPortfolio {
  return {
    ...portfolio,
    assetClasses: portfolio.assetClasses.map((assetClass) => ({
      ...assetClass,
      holdings: assetClass.holdings.map((holding) => ({
        ...holding,
        weight: round2(holding.weight),
      })),
    })),
  };
}

// Growth/defensive splits are anchored to Vanguard's Diversified Index
// range - the most widely cited SAA benchmark in the Australian market
// (Conservative 30/70, Balanced 50/50, Growth 70/30, High Growth 90/10),
// which also sits comfortably within the SuperRatings survey bands used
// industry-wide (SR Conservative Balanced 41-59% growth, SR Balanced
// 60-76%, SR Growth 77-90%). Moderate (40/60) is this platform's own
// addition between Conservative and Balanced, common in adviser risk
// profiling, interpolated between the two Vanguard anchor points.
const rawModelPortfolios: ModelPortfolio[] = [
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
    growthWeight: 40,
    defensiveWeight: 60,
    assetClasses: [
      australianEquities(18),
      internationalEquities(15),
      propertyInfrastructure(4),
      alternatives(3),
      australianFixedInterest(32),
      globalFixedInterest(20),
      cash(8),
    ],
  },
  {
    riskProfile: "Balanced",
    objective: "Designed for investors seeking a balance between long-term capital growth, income generation and downside risk management.",
    growthWeight: 50,
    defensiveWeight: 50,
    assetClasses: [
      australianEquities(25),
      internationalEquities(21),
      propertyInfrastructure(2),
      alternatives(2),
      australianFixedInterest(25),
      globalFixedInterest(15),
      cash(10),
    ],
  },
  {
    riskProfile: "Growth",
    objective: "Designed for investors seeking long-term capital growth, with a higher allocation to growth assets and tolerance for market volatility.",
    growthWeight: 70,
    defensiveWeight: 30,
    assetClasses: [
      australianEquities(35),
      internationalEquities(28),
      propertyInfrastructure(4),
      alternatives(3),
      australianFixedInterest(15),
      globalFixedInterest(9),
      cash(6),
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

export const modelPortfolios: ModelPortfolio[] = rawModelPortfolios.map(roundPortfolio);

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
