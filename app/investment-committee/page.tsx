import PageContent from '../../components/PageContent';
import { InvestmentDeepDivePanel } from '../../components/InvestmentDeepDivePanel';
import DecisionHistoryPanel from '../../components/DecisionHistoryPanel';
import HouseViewPanel from '../../components/HouseViewPanel';
import InvestmentCommitteeDashboard from '../../components/InvestmentCommitteeDashboard';

export default function InvestmentCommitteePage() {
  return (
    <PageContent
      title="Investment Committee"
      description="Deep-dive due diligence on new investments under consideration, house views, committee decisions, and portfolio priorities."
    >
      <InvestmentDeepDivePanel />
      <InvestmentCommitteeDashboard />
      <DecisionHistoryPanel />
      <HouseViewPanel />
    </PageContent>
  );
}
