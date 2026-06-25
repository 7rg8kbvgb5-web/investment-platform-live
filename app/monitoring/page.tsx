import PageContent from '../../components/PageContent';
import AlertRulesPanel from '../../components/AlertRulesPanel';
import AlertSummaryPanel from '../../components/AlertSummaryPanel';
import FundMonitoringPanel from '../../components/FundMonitoringPanel';
import MonitoringSummaryPanel from '../../components/MonitoringSummaryPanel';

export default function MonitoringPage() {
  return (
    <PageContent
      title="Monitoring"
      description="Monitor portfolios, review alerts, assess managed funds, and identify investment issues requiring attention."
    >
      <MonitoringSummaryPanel />
      <AlertSummaryPanel />
      <AlertRulesPanel />
      <FundMonitoringPanel />
    </PageContent>
  );
}
