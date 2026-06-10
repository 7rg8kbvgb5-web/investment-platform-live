'use client';

import { useCallback, useState } from 'react';
import type { FundMonitoringDecision } from '../domain/types/fund-monitoring';
import type { ResearchRequest } from '../domain/types/research-request';
import {
  createResearchRequestFromFundDecision,
  getMockResearchRequests,
} from '../lib/engines/research-request';
import FundReviewDecisionPanel from './FundReviewDecisionPanel';
import ResearchRequestPanel from './ResearchRequestPanel';

/**
 * Connects fund review decisions to structured research requests when
 * "Request More Research" is recorded. Local state only.
 */
export default function FundReviewResearchWorkflow() {
  const [researchRequests, setResearchRequests] = useState<ResearchRequest[]>(
    () => getMockResearchRequests()
  );

  const handleDecisionRecorded = useCallback(
    (decision: FundMonitoringDecision) => {
      if (decision.action !== 'request_more_research') {
        return;
      }

      setResearchRequests((current) => {
        const alreadyExists = current.some(
          (request) => request.relatedDecisionId === decision.id
        );

        if (alreadyExists) {
          return current;
        }

        const researchRequest = createResearchRequestFromFundDecision({
          decision,
          requestIndex: current.length,
        });

        if (!researchRequest) {
          return current;
        }

        return [...current, researchRequest];
      });
    },
    []
  );

  return (
    <>
      <FundReviewDecisionPanel onDecisionRecorded={handleDecisionRecorded} />
      <ResearchRequestPanel requests={researchRequests} />
    </>
  );
}
