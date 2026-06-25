import PageContent from '../../components/PageContent';
import GovernancePageContent from '../../components/GovernancePageContent';

export default function GovernancePage() {
  return (
    <PageContent
      title="Governance"
      description="Audit trail, approval workflow, deferred reviews, and governance evidence for investment decisions."
    >
      <GovernancePageContent />
    </PageContent>
  );
}
