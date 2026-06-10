import PageContent from '../../components/PageContent';
import DecisionHistoryPanel from '../../components/DecisionHistoryPanel';
import HouseViewPanel from '../../components/HouseViewPanel';
import InvestmentCommitteeDashboard from '../../components/InvestmentCommitteeDashboard';

export default function InvestmentCommitteePage() {
  return (
    <PageContent
      title="Investment Committee"
      description="Executive summary of house views, fund reviews, governance health, and committee priorities."
    >
      <InvestmentCommitteeDashboard />
      <DecisionHistoryPanel />
      <HouseViewPanel />
    </PageContent>
  );
}
