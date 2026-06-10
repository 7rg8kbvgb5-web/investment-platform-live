import PageContent from '../../components/PageContent';
import FundResearchLifecyclePanel from '../../components/FundResearchLifecyclePanel';
import FundReviewAuditTrailPanel from '../../components/FundReviewAuditTrailPanel';
import FundReviewResearchWorkflow from '../../components/FundReviewResearchWorkflow';
import MultiFundReviewDashboardPanel from '../../components/MultiFundReviewDashboardPanel';

export default function FundReviewsPage() {
  return (
    <PageContent
      title="Fund Reviews"
      description="Adviser fund review decisions, lifecycle oversight, and governed audit trail."
    >
      <MultiFundReviewDashboardPanel />
      <FundReviewResearchWorkflow />
      <FundReviewAuditTrailPanel />
      <FundResearchLifecyclePanel />
    </PageContent>
  );
}
