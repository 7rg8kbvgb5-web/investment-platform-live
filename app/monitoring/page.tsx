import PageContent from '../../components/PageContent';
import AlertRulesPanel from '../../components/AlertRulesPanel';
import AlertSummaryPanel from '../../components/AlertSummaryPanel';
import FundMonitoringPanel from '../../components/FundMonitoringPanel';
import MonitoringSummaryPanel from '../../components/MonitoringSummaryPanel';

export default function MonitoringPage() {
  return (
    <PageContent
      title="Monitoring"
      description="Unified monitoring status, alert engine, configurable rules, and fund assessments."
    >
      <MonitoringSummaryPanel />
      <AlertSummaryPanel />
      <AlertRulesPanel />
      <FundMonitoringPanel />
    </PageContent>
  );
}
