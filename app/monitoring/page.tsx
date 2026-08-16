import PageContent from '../../components/PageContent';
import { InvestmentMonitoringPanel } from '../../components/InvestmentMonitoringPanel';

export default function MonitoringPage() {
  return (
    <PageContent
      title="Monitoring"
      description="Live scan of the model portfolio's actual securities for macro events, holding-specific news, and better risk-adjusted alternatives."
    >
      <InvestmentMonitoringPanel />
    </PageContent>
  );
}
