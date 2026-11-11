import type { HoldingMarketData } from '../lib/engines/market-data';
import Panel from './ui/Panel';
import StatusBox from './dashboard/StatusBox';

function formatCurrency(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatMarketCap(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '—';
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
  // Fundamentals need EODHD's Fundamentals plan; hide the columns when none came back.
  const hasFundamentals = holdings.some((h) => h.fundamentals?.Highlights);
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
              {hasFundamentals ? <th>P/E</th> : null}
              {hasFundamentals ? <th>Dividend Yield</th> : null}
              {hasFundamentals ? <th>Market Cap</th> : null}
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
                {hasFundamentals ? (
                  <>
                    <td>{typeof holding.fundamentals?.Highlights?.PERatio === 'number' ? holding.fundamentals.Highlights.PERatio.toFixed(1) : '—'}</td>
                    <td>
                      {typeof holding.fundamentals?.Highlights?.DividendYield === 'number' && holding.fundamentals.Highlights.DividendYield > 0
                        ? `${(holding.fundamentals.Highlights.DividendYield * 100).toFixed(2)}%`
                        : '—'}
                    </td>
                    <td>{formatMarketCap(holding.fundamentals?.Highlights?.MarketCapitalization)}</td>
                  </>
                ) : null}
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
