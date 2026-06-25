import PageContent from '../../components/PageContent';
import DecisionHistoryPanel from '../../components/DecisionHistoryPanel';
import HouseViewPanel from '../../components/HouseViewPanel';
import InvestmentCommitteeDashboard from '../../components/InvestmentCommitteeDashboard';

export default function InvestmentCommitteePage() {
  return (
    <PageContent
      title="Investment Committee"
      description="Review house views, committee decisions, portfolio priorities, and investment governance health."
    >
      <InvestmentCommitteeDashboard />
      <DecisionHistoryPanel />
      <HouseViewPanel />
    </PageContent>
  );
}
