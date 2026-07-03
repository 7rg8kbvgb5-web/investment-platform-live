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

export const modelPortfolios: ModelPortfolio[] = [
  {
    riskProfile: "Balanced",
    objective:
      "Designed for investors seeking a balance between long-term capital growth, income generation and downside risk management.",
    growthWeight: 60,
    defensiveWeight: 40,
    assetClasses: [
      {
        name: "Australian Equities",
        type: "Growth",
        targetWeight: 30,
        description:
          "Direct Australian equities selected through the house view, sector positioning and security ranking process.",
        holdings: [
          {
            code: "CBA",
            name: "Commonwealth Bank",
            sector: "Financials",
            weight: 4,
            rationale: "Core financials exposure with strong franchise quality.",
          },
          {
            code: "MQG",
            name: "Macquarie Group",
            sector: "Financials",
            weight: 3,
            rationale: "Diversified financial exposure with global earnings drivers.",
          },
          {
            code: "BHP",
            name: "BHP Group",
            sector: "Materials",
            weight: 4,
            rationale: "Core resources exposure aligned with long-term commodity demand.",
          },
          {
            code: "CSL",
            name: "CSL Limited",
            sector: "Healthcare",
            weight: 3,
            rationale: "High-quality healthcare exposure with global earnings base.",
          },
        ],
      },
      {
        name: "International Equities",
        type: "Growth",
        targetWeight: 25,
        description:
          "International equity exposure used to diversify sector, currency and geographic risk.",
        holdings: [
          {
            code: "QUAL",
            name: "VanEck MSCI International Quality ETF",
            weight: 10,
            rationale: "Quality-focused global equity exposure.",
          },
          {
            code: "IVV",
            name: "iShares S&P 500 ETF",
            weight: 8,
            rationale: "Broad US large-cap exposure.",
          },
          {
            code: "Global Fund",
            name: "Active Global Equity Fund",
            weight: 7,
            rationale: "Active global equity exposure where manager skill is expected to add value.",
          },
        ],
      },
      {
        name: "Listed Property / Infrastructure",
        type: "Growth",
        targetWeight: 5,
        description:
          "Real asset exposure providing diversification, income and inflation sensitivity.",
        holdings: [
          {
            code: "VAP",
            name: "Australian Property Securities ETF",
            weight: 3,
            rationale: "Diversified listed property exposure.",
          },
          {
            code: "IFRA",
            name: "Global Infrastructure ETF",
            weight: 2,
            rationale: "Global infrastructure exposure with defensive income characteristics.",
          },
        ],
      },
      {
        name: "Australian Fixed Interest",
        type: "Defensive",
        targetWeight: 20,
        description:
          "Domestic fixed-income exposure focused on income, capital stability and liquidity.",
        holdings: [
          {
            code: "Direct Bonds",
            name: "Australian Corporate Bond Portfolio",
            weight: 14,
            rationale: "Direct bond exposure tailored to yield, maturity and credit quality.",
          },
          {
            code: "IAF",
            name: "iShares Core Composite Bond ETF",
            weight: 6,
            rationale: "Diversified Australian bond exposure.",
          },
        ],
      },
      {
        name: "Global Fixed Interest",
        type: "Defensive",
        targetWeight: 12,
        description:
          "Global fixed-income exposure for diversification across regions, issuers and interest-rate cycles.",
        holdings: [
          {
            code: "IHCB",
            name: "Global Corporate Bond ETF",
            weight: 7,
            rationale: "Global investment-grade credit exposure.",
          },
          {
            code: "Global Bond Fund",
            name: "Active Global Bond Fund",
            weight: 5,
            rationale: "Active duration and credit management.",
          },
        ],
      },
      {
        name: "Cash",
        type: "Defensive",
        targetWeight: 8,
        description:
          "Liquidity reserve for flexibility, income needs and tactical opportunities.",
        holdings: [
          {
            code: "Cash",
            name: "Cash / At Call Account",
            weight: 8,
            rationale: "Liquidity, optionality and short-term capital stability.",
          },
        ],
      },
    ],
  },
];

export function getModelPortfolioByRiskProfile(
  riskProfile: RiskProfile
): ModelPortfolio {
  const portfolio = modelPortfolios.find(
    (item) => item.riskProfile === riskProfile
  );

  if (!portfolio) {
    return modelPortfolios[0];
  }

  return portfolio;
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