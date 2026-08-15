import PageContent from '../../components/PageContent';
import MarketDataTable from '../../components/MarketDataTable';
import SectorHealthScorePanel from '../../components/SectorHealthScorePanel';
import PortfolioAnalyticsPanel from '../../components/PortfolioAnalyticsPanel';
import { getModelPortfolioMarketData } from '../../lib/engines/market-data';
import { isEodhdConfigured } from '../../lib/eodhd-client';
import StatusBox from '../../components/dashboard/StatusBox';

export const dynamic = 'force-dynamic';

export default async function DataAnalyticsPage() {
  const connected = isEodhdConfigured();
  const holdings = await getModelPortfolioMarketData();

  return (
    <PageContent
      title="Data Analytics"
      description="Live market data powering Sector Health Score, holdings-level pricing and fundamentals, and risk-adjusted portfolio analytics across the model portfolios."
    >
      <StatusBox variant={connected ? 'success' : 'warning'}>
        EODHD connection: {connected ? 'Active' : 'Not connected'}
        {!connected &&
          ' — add EODHD_API_KEY to Vercel environment variables to bring this page live.'}
      </StatusBox>

      <SectorHealthScorePanel />

      <PortfolioAnalyticsPanel />

      <MarketDataTable holdings={holdings} connected={connected} />
    </PageContent>
  );
}
