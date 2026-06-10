import PageContent from '../../components/PageContent';
import GovernancePageContent from '../../components/GovernancePageContent';

export default function GovernancePage() {
  return (
    <PageContent
      title="Governance"
      description="Audit trail, investment cases, approval workflow, and deferred review queue."
    >
      <GovernancePageContent />
    </PageContent>
  );
}
