-- Live tactical stance (Overweight/Neutral/Underweight) per global asset
-- class, from a Claude + web search read of current macro/market
-- conditions - not the house's own portfolio positioning, a market-level
-- tactical view sitting above the strategic weights on the Risk Profile
-- tab. One row per scan, all asset classes together (like weekly_briefs).

create table if not exists tactical_asset_class_view (
  id uuid primary key default gen_random_uuid(),
  asset_class_calls jsonb not null default '[]',
  raw_model_output text,
  generated_at timestamptz not null default now()
);

create index if not exists tactical_asset_class_view_generated_at_idx
  on tactical_asset_class_view (generated_at desc);

alter table tactical_asset_class_view enable row level security;

create policy "Allow full access to tactical_asset_class_view"
  on tactical_asset_class_view
  for all
  using (true)
  with check (true);
