import PageContent from '../../components/PageContent';
import { InvestmentCommitteeQueuePanel } from '../../components/InvestmentCommitteeQueuePanel';
import { InvestmentDeepDivePanel } from '../../components/InvestmentDeepDivePanel';

export const dynamic = 'force-dynamic';

export default function InvestmentCommitteePage() {
  return (
    <PageContent
      title="Investment Committee"
      description="Formal decisions on proposed swaps, the clients each one affects, and deep-dive due diligence on new investments under consideration."
    >
      <InvestmentCommitteeQueuePanel />
      <InvestmentDeepDivePanel />
    </PageContent>
  );
}
