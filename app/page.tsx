import PageContent from '../components/PageContent';
import FundResearchLifecyclePanel from '../components/FundResearchLifecyclePanel';
import InvestmentCommitteeDashboard from '../components/InvestmentCommitteeDashboard';
import MonitoringSummaryPanel from '../components/MonitoringSummaryPanel';
import SystemStatusPanel from '../components/SystemStatusPanel';
import DashboardHero from '../components/dashboard/DashboardHero';

export default function Home() {
  return (
    <>
      <DashboardHero />
      <PageContent
        title="Dashboard Overview"
        description="Executive command centre for investment committee priorities, monitoring status, fund research lifecycle, and system readiness."
      >
        <SystemStatusPanel />

        <InvestmentCommitteeDashboard />

        <MonitoringSummaryPanel />

        <FundResearchLifecyclePanel />
      </PageContent>
    </>
  );
}