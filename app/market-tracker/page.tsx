import PageContent from '../../components/PageContent';
import SmallCapTrackerPanel from '../../components/SmallCapTrackerPanel';

export default function MarketTrackerPage() {
  return (
    <PageContent
      title="Market Tracker"
      description="Small and mid caps: Small Ordinaries relative strength against the ASX 200, market breadth, key support levels and ASIC short interest. Every figure comes from a market data feed, not AI."
    >
      <SmallCapTrackerPanel />
    </PageContent>
  );
}
