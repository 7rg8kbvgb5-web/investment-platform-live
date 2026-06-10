import PageContent from '../components/PageContent';
import FundResearchLifecyclePanel from '../components/FundResearchLifecyclePanel';
import MonitoringSummaryPanel from '../components/MonitoringSummaryPanel';
import SystemStatusPanel from '../components/SystemStatusPanel';
import DashboardHero from '../components/dashboard/DashboardHero';

export default function Home() {
  return (
    <>
      <DashboardHero />
      <PageContent
        title="Dashboard Overview"
        description="Executive snapshot of fund research lifecycle and unified monitoring status."
      >
        <SystemStatusPanel />
        <MonitoringSummaryPanel />
        <FundResearchLifecyclePanel />
      </PageContent>
    </>
  );
}
