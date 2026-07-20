import PageContent from '../components/PageContent';
import FundResearchLifecyclePanel from '../components/FundResearchLifecyclePanel';
import InvestmentCommitteeDashboard from '../components/InvestmentCommitteeDashboard';
import MonitoringSummaryPanel from '../components/MonitoringSummaryPanel';
import SystemStatusPanel from '../components/SystemStatusPanel';
import DashboardHero from '../components/dashboard/DashboardHero';
import AttentionPanel from '../components/dashboard/AttentionPanel';
import MacroWatchPanel from '../components/dashboard/MacroWatchPanel';
import InProgressPanel from '../components/dashboard/InProgressPanel';
import RecentlyActionedPanel from '../components/dashboard/RecentlyActionedPanel';
import { getLatestWeeklyBrief } from '../lib/engines/weekly-brief';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let brief = null;
  try {
    brief = await getLatestWeeklyBrief();
  } catch {
    brief = null;
  }

  return (
    <>
      <DashboardHero />

      <div style={summaryGrid}>
        <AttentionPanel />
        <MacroWatchPanel brief={brief} />
        <InProgressPanel />
        <RecentlyActionedPanel />
      </div>

      <PageContent
        title="Full detail"
        description="Deeper detail behind the summary above — Investment Committee, monitoring, and research workflows."
      >
        <InvestmentCommitteeDashboard />

        <MonitoringSummaryPanel />

        <FundResearchLifecyclePanel />

        <SystemStatusPanel />
      </PageContent>
    </>
  );
}

const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
  gap: '18px',
  marginBottom: '10px',
};
