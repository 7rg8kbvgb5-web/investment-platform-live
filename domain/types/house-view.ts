/** Investment committee stance on a house view item. */
export type HouseViewCategory = 'Positive' | 'Neutral' | 'Negative';

/** Domain the house view applies to. */
export type HouseViewArea =
  | 'Asset Classes'
  | 'Sectors'
  | 'Funds'
  | 'Individual Securities'
  | 'Macro Themes';

/** A single house-view recommendation for tactical positioning and committee decisions. */
export type HouseViewRecommendation = {
  id: string;
  title: string;
  category: HouseViewCategory;
  area: HouseViewArea;
  summary: string;
  supportingRationale: string;
  /** ISO date (YYYY-MM-DD) when the view takes effect. */
  effectiveDate: string;
  /** ISO date (YYYY-MM-DD) when the view should be reviewed. */
  reviewDate: string;
  /** Committee confidence in the view, 0–100. */
  confidenceScore: number;
};

export type HouseViewAnalysisInput = {
  recommendations: HouseViewRecommendation[];
};

export type HouseViewAnalysisResult = {
  sortedRecommendations: HouseViewRecommendation[];
  countsByCategory: Record<HouseViewCategory, number>;
  countsByArea: Record<HouseViewArea, number>;
  averageConfidenceScore: number;
};
