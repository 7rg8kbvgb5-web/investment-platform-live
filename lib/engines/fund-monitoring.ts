import type {
  FundMonitoringAssessment,
  FundMonitoringAssessmentResult,
  FundMonitoringStatus,
  FundMonitoringSummary,
  FundReviewPriority,
  FundReviewReason,
  MonitoredFund,
} from '../../domain/types/fund-monitoring';
import { PREVIEW_DATE } from '../format-timestamp';

export const MOCK_MONITORED_FUNDS: MonitoredFund[] = [
  {
    fundId: 'monitored-global-quality',
    fundName: 'Global Quality Fund',
    assetClass: 'International Equities',
    status: 'Review Required',
    reviewPriority: 'High',
    reviewReason: 'Underperformance',
    lastReviewed: '2026-03-15',
    nextReview: '2026-06-01',
    modelPortfolioId: 'model-balanced-growth',
  },
  {
    fundId: 'monitored-aus-equities-active',
    fundName: 'Australian Equities Active Fund',
    assetClass: 'Australian Equities',
    status: 'Watch',
    reviewPriority: 'Medium',
    reviewReason: 'Style Drift',
    lastReviewed: '2026-04-20',
    nextReview: '2026-07-20',
    modelPortfolioId: 'model-balanced-growth',
  },
  {
    fundId: 'monitored-emerging-markets',
    fundName: 'Emerging Markets Fund',
    assetClass: 'International Equities',
    status: 'Current',
    reviewPriority: 'Low',
    reviewReason: 'Scheduled Review',
    lastReviewed: '2026-05-01',
    nextReview: '2026-11-01',
    modelPortfolioId: 'model-growth',
  },
  {
    fundId: 'monitored-fixed-income',
    fundName: 'Fixed Income Fund',
    assetClass: 'Fixed Income',
    status: 'Current',
    reviewPriority: 'Low',
    reviewReason: 'Scheduled Review',
    lastReviewed: '2026-04-10',
    nextReview: '2026-10-10',
    modelPortfolioId: 'model-conservative',
  },
  {
    fundId: 'monitored-small-companies',
    fundName: 'Small Companies Fund',
    assetClass: 'Australian Equities',
    status: 'Review Required',
    reviewPriority: 'Critical',
    reviewReason: 'Manager Change',
    lastReviewed: '2026-02-28',
    nextReview: '2026-05-28',
    modelPortfolioId: 'model-growth',
  },
  {
    fundId: 'monitored-alternatives',
    fundName: 'Alternatives Fund',
    assetClass: 'Alternatives',
    status: 'Replacement Candidate',
    reviewPriority: 'High',
    reviewReason: 'Better Alternative Available',
    lastReviewed: '2026-03-01',
    nextReview: '2026-06-01',
    replacementCandidate: {
      fundId: 'candidate-alternatives-plus',
      fundName: 'Alternatives Plus Fund',
      assetClass: 'Alternatives',
      rationale:
        'Lower fee structure and stronger risk-adjusted returns on placeholder metrics.',
    },
    modelPortfolioId: 'model-balanced-growth',
  },
];

export function getMockMonitoredFunds(): MonitoredFund[] {
  return MOCK_MONITORED_FUNDS.map((fund) => ({ ...fund }));
}

function isReviewOverdue(nextReview: string, currentDate: string): boolean {
  return nextReview < currentDate;
}

function buildAssessmentNotes(
  fund: MonitoredFund,
  currentDate: string
): string {
  const overdue = isReviewOverdue(fund.nextReview, currentDate);

  if (fund.status === 'Replacement Candidate' && fund.replacementCandidate) {
    return `${fund.fundName} flagged as a replacement candidate (${formatFundReviewReason(fund.reviewReason)}). Suggested alternative: ${fund.replacementCandidate.fundName}. Adviser review required before any change.`;
  }

  if (fund.status === 'Review Required') {
    const overdueNote = overdue ? ' Next review date is overdue.' : '';
    return `${fund.fundName} requires adviser review (${formatFundReviewReason(fund.reviewReason)}).${overdueNote}`;
  }

  if (fund.status === 'Watch') {
    return `${fund.fundName} on watch list (${formatFundReviewReason(fund.reviewReason)}). Monitor at next scheduled review (${fund.nextReview}).`;
  }

  if (overdue) {
    return `${fund.fundName} remains current but scheduled review date (${fund.nextReview}) is overdue.`;
  }

  return `${fund.fundName} remains appropriate and current. Next review scheduled for ${fund.nextReview}.`;
}

export function assessMonitoredFunds(
  funds: MonitoredFund[],
  currentDate: string = PREVIEW_DATE
): FundMonitoringAssessmentResult {
  const assessments: FundMonitoringAssessment[] = funds.map((fund) => ({
    fund,
    assessmentNotes: buildAssessmentNotes(fund, currentDate),
    isReviewOverdue: isReviewOverdue(fund.nextReview, currentDate),
  }));

  return {
    assessments,
    summary: summariseFundMonitoring(funds),
  };
}

export function summariseFundMonitoring(
  funds: MonitoredFund[]
): FundMonitoringSummary {
  return {
    totalMonitoredFunds: funds.length,
    fundsOnWatch: funds.filter((fund) => fund.status === 'Watch').length,
    reviewRequired: funds.filter((fund) => fund.status === 'Review Required')
      .length,
    replacementCandidates: funds.filter(
      (fund) => fund.status === 'Replacement Candidate'
    ).length,
    criticalPriorityReviews: funds.filter(
      (fund) => fund.reviewPriority === 'Critical'
    ).length,
    highPriorityReviews: funds.filter(
      (fund) => fund.reviewPriority === 'High'
    ).length,
  };
}

export function formatFundMonitoringStatus(
  status: FundMonitoringStatus
): string {
  return status;
}

export function formatFundReviewPriority(
  priority: FundReviewPriority
): string {
  return priority;
}

export function formatFundReviewReason(reason: FundReviewReason): string {
  return reason;
}
