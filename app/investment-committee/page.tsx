import PageContent from '../../components/PageContent';
import { InvestmentDeepDivePanel } from '../../components/InvestmentDeepDivePanel';

export default function InvestmentCommitteePage() {
  return (
    <PageContent
      title="Investment Committee"
      description="Deep-dive due diligence on new investments under consideration."
    >
      <InvestmentDeepDivePanel />
    </PageContent>
  );
}
