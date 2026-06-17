'use client';

import type { ApprovalWorkflow } from '../domain/types/approval';
import ApprovalWorkflowPanel from './dashboard/ApprovalWorkflowPanel';
import DeferredReviewQueuePanel from './DeferredReviewQueuePanel';
import GovernanceAuditTrailPanel from './GovernanceAuditTrailPanel';

const MOCK_APPROVAL_WORKFLOW: ApprovalWorkflow = {
  scenarioName: 'Balanced — Tactical Overlay Preview',
  status: 'draft',
  approvalRequired: true,
  reviewer: null,
  approvalNotes: null,
  timestamp: '2026-06-01T09:00:00.000Z',
};

export default function GovernancePageContent() {
  return (
    <>
      <GovernanceAuditTrailPanel />
      <ApprovalWorkflowPanel workflow={MOCK_APPROVAL_WORKFLOW} />
      <DeferredReviewQueuePanel />
    </>
  );
}