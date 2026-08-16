-- Live investment monitoring, replacing the old mock alert/fund-monitoring
-- panels. Each scan produces alerts in three categories, scoped to the
-- actual securities that make up the model portfolio (model_portfolio_
-- securities), not a static/mock list:
--   macro       - a macro/geopolitical/commodity event that could affect
--                 one of the model's asset classes (e.g. a sharp gold
--                 price move, an oil-relevant conflict)
--   investment  - news specific to one of the model's actual holdings
--                 (e.g. a fund's CIO departing, a rating change)
--   alternative - a possible better risk-adjusted alternative within an
--                 asset class the model already holds
-- Every alert is a recommendation for adviser/Investment Committee
-- review - nothing here ever changes a position automatically.

create table if not exists investment_monitoring_alerts (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null,
  category text not null check (category in ('macro', 'investment', 'alternative')),
  severity text not null default 'medium' check (severity in ('critical', 'high', 'medium', 'low')),
  title text not null,
  summary text not null,
  affected_asset_class text,
  affected_codes text[] not null default '{}',
  source_note text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'dismissed')),
  raw_model_output text,
  generated_at timestamptz not null default now()
);

create index if not exists investment_monitoring_alerts_scan_id_idx
  on investment_monitoring_alerts (scan_id);

create index if not exists investment_monitoring_alerts_generated_at_idx
  on investment_monitoring_alerts (generated_at desc);

alter table investment_monitoring_alerts enable row level security;

create policy "Allow full access to investment_monitoring_alerts"
  on investment_monitoring_alerts
  for all
  using (true)
  with check (true);
