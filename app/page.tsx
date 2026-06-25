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
        description="Daily command centre for investment committee priorities, monitoring alerts, research progress, and platform readiness."
      >
        <InvestmentCommitteeDashboard />

        <MonitoringSummaryPanel />

        <FundResearchLifecyclePanel />

        <SystemStatusPanel />
      </PageContent>
    </>
  );
}