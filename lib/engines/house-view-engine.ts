import type {
  HouseViewAnalysisInput,
  HouseViewAnalysisResult,
  HouseViewArea,
  HouseViewCategory,
  HouseViewRecommendation,
} from '../../domain/types/house-view';
import { PREVIEW_DATE } from '../format-timestamp';

const HOUSE_VIEW_AREAS: HouseViewArea[] = [
  'Asset Classes',
  'Sectors',
  'Funds',
  'Individual Securities',
  'Macro Themes',
];

/** Stable mock house views for local preview (no live market data). */
export const MOCK_HOUSE_VIEW_RECOMMENDATIONS: HouseViewRecommendation[] = [
  {
    id: 'hv-australian-equities',
    title: 'Australian Equities',
    category: 'Positive',
    area: 'Asset Classes',
    summary:
      'Maintain a modest overweight to Australian equities relative to neutral benchmark weights.',
    supportingRationale:
      'Domestic earnings revisions have stabilised, dividend yields remain supportive, and valuations sit near long-run averages after the recent correction. Prefer quality and franking-aware exposures over broad beta alone.',
    effectiveDate: '2026-01-15',
    reviewDate: '2026-09-30',
    confidenceScore: 78,
  },
  {
    id: 'hv-international-equities',
    title: 'International Equities',
    category: 'Neutral',
    area: 'Asset Classes',
    summary:
      'Hold international equities at strategic weight; no material tactical tilt at this stage.',
    supportingRationale:
      'US mega-cap concentration and geopolitical uncertainty offset improving global growth signals. Maintain diversified developed-market exposure without adding aggressive regional tilts until clarity improves.',
    effectiveDate: '2026-02-01',
    reviewDate: '2026-10-15',
    confidenceScore: 65,
  },
  {
    id: 'hv-gold',
    title: 'Gold',
    category: 'Positive',
    area: 'Macro Themes',
    summary:
      'Maintain a strategic allocation to gold as a portfolio diversifier and inflation hedge.',
    supportingRationale:
      'Real yields have peaked and central-bank demand remains structurally supportive. Gold provides ballast against geopolitical shocks and complements growth-oriented equity exposures without relying on credit beta.',
    effectiveDate: '2026-01-15',
    reviewDate: '2026-08-31',
    confidenceScore: 72,
  },
  {
    id: 'hv-private-credit',
    title: 'Private Credit',
    category: 'Positive',
    area: 'Asset Classes',
    summary:
      'Favour a modest allocation to private credit for income-oriented portfolios within liquidity constraints.',
    supportingRationale:
      'Floating-rate structures benefit from elevated base rates while bank retrenchment has widened lending spreads. Selectivity is critical — prefer senior secured structures with experienced managers and transparent liquidity terms.',
    effectiveDate: '2026-03-01',
    reviewDate: '2026-11-30',
    confidenceScore: 70,
  },
];

function compareHouseViews(
  a: HouseViewRecommendation,
  b: HouseViewRecommendation
): number {
  const areaDiff =
    HOUSE_VIEW_AREAS.indexOf(a.area) - HOUSE_VIEW_AREAS.indexOf(b.area);

  if (areaDiff !== 0) {
    return areaDiff;
  }

  return a.title.localeCompare(b.title);
}

function emptyCategoryCounts(): Record<HouseViewCategory, number> {
  return {
    Positive: 0,
    Neutral: 0,
    Negative: 0,
  };
}

function emptyAreaCounts(): Record<HouseViewArea, number> {
  return HOUSE_VIEW_AREAS.reduce(
    (counts, area) => {
      counts[area] = 0;
      return counts;
    },
    {} as Record<HouseViewArea, number>
  );
}

export function formatHouseViewCategory(category: HouseViewCategory): string {
  return category;
}

export function formatHouseViewArea(area: HouseViewArea): string {
  return area;
}

export function categoryStatusVariant(
  category: HouseViewCategory
): 'success' | 'warning' | 'neutral' {
  switch (category) {
    case 'Positive':
      return 'success';
    case 'Negative':
      return 'warning';
    case 'Neutral':
      return 'neutral';
  }
}

/**
 * Returns stable mock house-view recommendations for local preview workflows.
 */
export function getMockHouseViewRecommendations(): HouseViewRecommendation[] {
  return MOCK_HOUSE_VIEW_RECOMMENDATIONS.map((recommendation) => ({
    ...recommendation,
  }));
}

/**
 * Sorts and summarises house-view recommendations for display and downstream engines.
 */
export function analyzeHouseViews({
  recommendations,
}: HouseViewAnalysisInput): HouseViewAnalysisResult {
  const sortedRecommendations = [...recommendations].sort(compareHouseViews);

  const countsByCategory = emptyCategoryCounts();
  const countsByArea = emptyAreaCounts();
  let confidenceTotal = 0;

  for (const recommendation of sortedRecommendations) {
    countsByCategory[recommendation.category] += 1;
    countsByArea[recommendation.area] += 1;
    confidenceTotal += recommendation.confidenceScore;
  }

  const averageConfidenceScore =
    sortedRecommendations.length === 0
      ? 0
      : Math.round(confidenceTotal / sortedRecommendations.length);

  return {
    sortedRecommendations,
    countsByCategory,
    countsByArea,
    averageConfidenceScore,
  };
}

/** Stable reference date used when comparing review schedules in future workflows. */
export function getHouseViewReferenceDate(): string {
  return PREVIEW_DATE;
}
