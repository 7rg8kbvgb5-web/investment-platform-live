import PageContent from '../../components/PageContent';
import AlertRulesPanel from '../../components/AlertRulesPanel';
import AlertSummaryPanel from '../../components/AlertSummaryPanel';
import FundMonitoringPanel from '../../components/FundMonitoringPanel';
import MonitoringSummaryPanel from '../../components/MonitoringSummaryPanel';
import ModelPortfolioHealthSection from '../../components/ModelPortfolioHealthSection';

export default function MonitoringPage() {
  return (
    <PageContent
      title="Monitoring"
      description="Monitor portfolios, review alerts, assess managed funds, and identify investment issues requiring attention."
    >
      <MonitoringSummaryPanel />
      <ModelPortfolioHealthSection />
      <AlertSummaryPanel />
      <AlertRulesPanel />
      <FundMonitoringPanel />
    </PageContent>
  );
}
