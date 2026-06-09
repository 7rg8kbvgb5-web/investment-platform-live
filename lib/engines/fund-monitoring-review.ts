import type {
  FundAlternative,
  FundMonitoringReview,
  FundMonitoringReviewInput,
  FundScoreProfile,
} from '../../domain/types/fund-monitoring';
import { PREVIEW_TIMESTAMP } from '../format-timestamp';

/** Default lead (composite points) before an alternative triggers a review recommendation. */
const DEFAULT_REVIEW_THRESHOLD = 5;

const SCORE_KEYS: (keyof FundScoreProfile)[] = [
  'performanceScore',
  'costScore',
  'riskScore',
  'liquidityScore',
  'qualitativeScore',
];

function averageScore(scores: FundScoreProfile): number {
  const total = SCORE_KEYS.reduce((sum, key) => sum + scores[key], 0);
  return total / SCORE_KEYS.length;
}

function filterSameAssetClassAlternatives(
  currentAssetClass: string,
  alternatives: FundAlternative[]
): FundAlternative[] {
  return alternatives.filter(
    (alternative) => alternative.assetClass === currentAssetClass
  );
}

function findBestAlternative(
  alternatives: FundAlternative[]
): { alternative: FundAlternative; compositeScore: number } | null {
  if (alternatives.length === 0) {
    return null;
  }

  let best: { alternative: FundAlternative; compositeScore: number } | null =
    null;

  for (const alternative of alternatives) {
    const compositeScore = averageScore(alternative);

    if (best === null || compositeScore > best.compositeScore) {
      best = { alternative, compositeScore };
    }
  }

  return best;
}

function buildRetainReason(
  fundName: string,
  currentScore: number,
  bestAlternative: { alternative: FundAlternative; compositeScore: number } | null,
  threshold: number
): string {
  if (bestAlternative === null) {
    return `${fundName} remains the preferred fund; no same-asset-class alternatives were supplied for comparison.`;
  }

  const scoreGap = bestAlternative.compositeScore - currentScore;

  if (scoreGap <= threshold) {
    return `${fundName} remains preferred (composite ${currentScore.toFixed(1)} vs best alternative ${bestAlternative.compositeScore.toFixed(1)}; gap ${scoreGap.toFixed(1)} within review threshold of ${threshold}).`;
  }

  return `${fundName} remains preferred based on composite scoring (${currentScore.toFixed(1)} vs ${bestAlternative.compositeScore.toFixed(1)}).`;
}

function buildReviewReason(
  currentFundName: string,
  alternativeName: string,
  currentScore: number,
  alternativeScore: number,
  threshold: number
): string {
  const scoreGap = alternativeScore - currentScore;
  return `${alternativeName} scores higher than ${currentFundName} on composite metrics (${alternativeScore.toFixed(1)} vs ${currentScore.toFixed(1)}, +${scoreGap.toFixed(1)} above the ${threshold}-point review threshold). Adviser review is required before any implementation; funds are not replaced automatically.`;
}

/**
 * Compares a model-portfolio fund holding against same-asset-class alternatives
 * using placeholder score fields. Returns a review recommendation only — no
 * automatic replacement.
 */
export function reviewFundMonitoring({
  currentFund,
  alternatives,
  reviewThreshold = DEFAULT_REVIEW_THRESHOLD,
  timestamp,
}: FundMonitoringReviewInput): FundMonitoringReview {
  const eligibleAlternatives = filterSameAssetClassAlternatives(
    currentFund.assetClass,
    alternatives
  );

  const currentCompositeScore = averageScore(currentFund);
  const bestAlternative = findBestAlternative(eligibleAlternatives);

  const bestAlternativeCompositeScore = bestAlternative?.compositeScore ?? null;

  const shouldReviewAlternative =
    bestAlternative !== null &&
    bestAlternative.compositeScore - currentCompositeScore > reviewThreshold;

  if (shouldReviewAlternative && bestAlternative !== null) {
    return {
      currentFund,
      alternatives: eligibleAlternatives,
      recommendation: 'review_alternative',
      recommendedAlternativeId: bestAlternative.alternative.fundId,
      recommendedAlternativeName: bestAlternative.alternative.fundName,
      reason: buildReviewReason(
        currentFund.fundName,
        bestAlternative.alternative.fundName,
        currentCompositeScore,
        bestAlternative.compositeScore,
        reviewThreshold
      ),
      requiresAdviserReview: true,
      currentCompositeScore,
      bestAlternativeCompositeScore,
      timestamp: timestamp ?? PREVIEW_TIMESTAMP,
    };
  }

  return {
    currentFund,
    alternatives: eligibleAlternatives,
    recommendation: 'retain_current',
    recommendedAlternativeId: null,
    recommendedAlternativeName: null,
    reason: buildRetainReason(
      currentFund.fundName,
      currentCompositeScore,
      bestAlternative,
      reviewThreshold
    ),
    requiresAdviserReview: false,
    currentCompositeScore,
    bestAlternativeCompositeScore,
    timestamp: timestamp ?? PREVIEW_TIMESTAMP,
  };
}
