-- Live fund review monitoring, replacing the old mock fund-review
-- lifecycle/audit-trail/workflow panels. Scoped specifically to
-- holdings tagged listed_fund or unlisted_fund in the model portfolio
-- (see migration 0010_holding_type.sql), across three categories
-- tailored to fund due diligence rather than single-security review:
--   manager      - manager/team changes (departures, ownership, capacity)
--   performance  - performance vs benchmark/peers, ratings agency moves
--   structural   - listed: NTA premium/discount, gearing; unlisted:
--                  liquidity terms, gates, fee changes, valuation issues

create table if not exists fund_review_alerts (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null,
  fund_code text not null,
  fund_name text not null,
  holding_type text not null,
  category text not null check (category in ('manager', 'performance', 'structural')),
  severity text not null default 'medium' check (severity in ('critical', 'high', 'medium', 'low')),
  title text not null,
  summary text not null,
  source_note text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'dismissed')),
  raw_model_output text,
  generated_at timestamptz not null default now()
);

create index if not exists fund_review_alerts_scan_id_idx
  on fund_review_alerts (scan_id);

create index if not exists fund_review_alerts_generated_at_idx
  on fund_review_alerts (generated_at desc);

alter table fund_review_alerts enable row level security;

create policy "Allow full access to fund_review_alerts"
  on fund_review_alerts
  for all
  using (true)
  with check (true);
