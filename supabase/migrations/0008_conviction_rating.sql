-- Lets a house-view upload (Ord Minnett or Barrenjoey) carry that
-- source's rating for the security, so it can feed into a per-security
-- conviction rating alongside the consensus view - same rating scale
-- convention as consensus (free text - Buy/Accumulate/Hold/Reduce/Sell
-- etc, whatever the source itself uses).
alter table research_documents
  add column if not exists house_view_rating text;

comment on column research_documents.house_view_rating is
  'This source''s rating for the security (e.g. Buy/Hold/Sell), only meaningful for Ord Minnett/Barrenjoey house-view uploads.';

-- Caches the latest consensus view lookup per ticker, so the conviction
-- rating (and anything else that wants a security's consensus) can read
-- it without firing a fresh web-search scan every time. One row per
-- code - each new lookup overwrites the previous cache for that ticker.
create table if not exists consensus_view_cache (
  code text primary key,
  name text,
  current_price numeric,
  consensus_rating text,
  average_price_target numeric,
  average_yield numeric,
  recommendations jsonb not null default '[]',
  generated_at timestamptz not null default now()
);

alter table consensus_view_cache enable row level security;

create policy "Allow full access to consensus_view_cache"
  on consensus_view_cache
  for all
  using (true)
  with check (true);
