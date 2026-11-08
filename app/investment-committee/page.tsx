import PageContent from '../../components/PageContent';
import { InvestmentCommitteeQueuePanel } from '../../components/InvestmentCommitteeQueuePanel';
import { InvestmentDeepDivePanel } from '../../components/InvestmentDeepDivePanel';

export const dynamic = 'force-dynamic';

export default function InvestmentCommitteePage() {
  return (
    <PageContent
      title="Investment Committee"
      description="Deep-dive due diligence on new investments under consideration, and formal decisions on every proposed change to the house model."
    >
      <InvestmentDeepDivePanel />
      <InvestmentCommitteeQueuePanel />
    </PageContent>
  );
}
