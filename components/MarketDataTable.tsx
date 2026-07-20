import type { HoldingMarketData } from '../lib/engines/market-data';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';

function formatCurrency(value: number | undefined): string {
  if (value === undefined) return '—';
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number | undefined): string {
  if (value === undefined) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatMarketCap(value: number | undefined): string {
  if (!value) return '—';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

export default function MarketDataTable({
  holdings,
  connected,
}: {
  holdings: HoldingMarketData[];
  connected: boolean;
}) {
  const quotable = holdings.filter((h) => h.quotable);
  const notQuotable = holdings.filter((h) => !h.quotable);

  return (
    <Panel eyebrow="EODHD — Live Market Data" title="Model Portfolio Holdings">
      {!connected && (
        <StatusBox variant="warning">
          EODHD isn&apos;t connected yet — add <code>EODHD_API_KEY</code> to Vercel to
          bring this table live. Showing the holdings this will cover once
          connected.
        </StatusBox>
      )}

      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Sector / Asset Class</th>
              <th>Last Price</th>
              <th>Change</th>
              <th>P/E</th>
              <th>Dividend Yield</th>
              <th>Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {quotable.map((holding) => (
              <tr key={holding.code}>
                <td style={{ fontWeight: 700 }}>{holding.code}</td>
                <td>{holding.name}</td>
                <td>{holding.sector ?? '—'}</td>
                <td>{formatCurrency(holding.quote?.close)}</td>
                <td>{formatPercent(holding.quote?.change_p)}</td>
                <td>{holding.fundamentals?.Highlights?.PERatio?.toFixed(1) ?? '—'}</td>
                <td>
                  {holding.fundamentals?.Highlights?.DividendYield
                    ? `${(holding.fundamentals.Highlights.DividendYield * 100).toFixed(2)}%`
                    : '—'}
                </td>
                <td>{formatMarketCap(holding.fundamentals?.Highlights?.MarketCapitalization)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {notQuotable.length > 0 && (
        <p style={{ marginTop: '14px', fontSize: '12px', color: '#94a3b8' }}>
          Not individually quotable — direct mandates, active funds and cash:{' '}
          {notQuotable.map((h) => h.name).join(', ')}.
        </p>
      )}
    </Panel>
  );
}
