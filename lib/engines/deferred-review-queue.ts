import type {
  DeferredReview,
  DeferredReviewStatus,
} from '../../domain/types/fund-monitoring';
import { PREVIEW_DATE } from '../format-timestamp';

const DEFAULT_REVIEW_AGAIN_DAYS = 30;
const DUE_SOON_WINDOW_DAYS = 7;

function toDateOnly(value: string): Date | null {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function getCurrentDateOnly(currentDate?: string): Date {
  if (currentDate) {
    const parsed = toDateOnly(currentDate);

    if (parsed) {
      return parsed;
    }
  }

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDaysToDateOnly(iso: string, days: number): string {
  const base = toDateOnly(iso) ?? toDateOnly(PREVIEW_DATE)!;
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function compareDeferredReviewsChronologically(
  a: DeferredReview,
  b: DeferredReview
): number {
  const deferredDiff =
    new Date(a.deferredDate).getTime() - new Date(b.deferredDate).getTime();

  if (deferredDiff !== 0) {
    return deferredDiff;
  }

  return a.id.localeCompare(b.id);
}

export type CreateDeferredReviewInput = {
  reviewTitle: string;
  fundOrRecommendationName: string;
  deferralReason: string;
  deferredDate: string;
  reviewAgainInDays?: number;
  id?: string;
};

export type ResolveDeferredReviewStatusInput = {
  reviewAgainDate: string;
  completed?: boolean;
  currentDate?: string;
};

export type AnalyzeDeferredReviewQueueInput = {
  reviews: DeferredReview[];
  currentDate?: string;
};

export type DeferredReviewQueueResult = {
  sortedReviews: DeferredReview[];
  openReviews: DeferredReview[];
  countsByStatus: Record<DeferredReviewStatus, number>;
};

/**
 * Computes queue status from review-again date and completion flag.
 */
export function resolveDeferredReviewStatus({
  reviewAgainDate,
  completed = false,
  currentDate,
}: ResolveDeferredReviewStatusInput): DeferredReviewStatus {
  if (completed) {
    return 'Completed';
  }

  const reviewDate = toDateOnly(reviewAgainDate);
  const today = getCurrentDateOnly(currentDate);

  if (!reviewDate) {
    return 'Deferred';
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilReview = Math.ceil(
    (reviewDate.getTime() - today.getTime()) / msPerDay
  );

  if (daysUntilReview < 0) {
    return 'Overdue';
  }

  if (daysUntilReview <= DUE_SOON_WINDOW_DAYS) {
    return 'Due Soon';
  }

  return 'Deferred';
}

/**
 * Creates a deferred review queue entry when an adviser defers a fund review.
 */
export function createDeferredReview({
  reviewTitle,
  fundOrRecommendationName,
  deferralReason,
  deferredDate,
  reviewAgainInDays = DEFAULT_REVIEW_AGAIN_DAYS,
  id,
}: CreateDeferredReviewInput): DeferredReview {
  const trimmedReason = deferralReason.trim();
  const reviewAgainDate = addDaysToDateOnly(deferredDate, reviewAgainInDays);
  const resolvedId =
    id ??
    `deferred-${deferredDate}-${fundOrRecommendationName.replace(/\s+/g, '-').toLowerCase()}`;

  const status = resolveDeferredReviewStatus({ reviewAgainDate });

  return {
    id: resolvedId,
    reviewTitle,
    fundOrRecommendationName,
    deferralReason: trimmedReason,
    deferredDate,
    reviewAgainDate,
    status,
  };
}

export function withResolvedDeferredReviewStatus(
  review: DeferredReview,
  currentDate?: string
): DeferredReview {
  if (review.status === 'Completed') {
    return review;
  }

  return {
    ...review,
    status: resolveDeferredReviewStatus({
      reviewAgainDate: review.reviewAgainDate,
      currentDate,
    }),
  };
}

export function markDeferredReviewCompleted(
  review: DeferredReview
): DeferredReview {
  return {
    ...review,
    status: 'Completed',
  };
}

/**
 * Marks all non-completed deferred reviews as completed when the review is resolved.
 */
export function completeOpenDeferredReviews(
  reviews: DeferredReview[]
): DeferredReview[] {
  return reviews.map((review) =>
    review.status === 'Completed' ? review : markDeferredReviewCompleted(review)
  );
}

const ALL_STATUSES: DeferredReviewStatus[] = [
  'Deferred',
  'Due Soon',
  'Overdue',
  'Completed',
];

function emptyStatusCounts(): Record<DeferredReviewStatus, number> {
  return {
    Deferred: 0,
    'Due Soon': 0,
    Overdue: 0,
    Completed: 0,
  };
}

/**
 * Sorts deferred reviews and derives open queue views with resolved statuses.
 */
export function analyzeDeferredReviewQueue({
  reviews,
  currentDate,
}: AnalyzeDeferredReviewQueueInput): DeferredReviewQueueResult {
  const resolvedReviews = reviews.map((review) =>
    withResolvedDeferredReviewStatus(review, currentDate)
  );
  const sortedReviews = [...resolvedReviews].sort(
    compareDeferredReviewsChronologically
  );
  const openReviews = sortedReviews.filter(
    (review) => review.status !== 'Completed'
  );

  const countsByStatus = emptyStatusCounts();

  for (const status of ALL_STATUSES) {
    countsByStatus[status] = sortedReviews.filter(
      (review) => review.status === status
    ).length;
  }

  return {
    sortedReviews,
    openReviews,
    countsByStatus,
  };
}

export function formatDeferredReviewStatus(status: DeferredReviewStatus): string {
  return status;
}
