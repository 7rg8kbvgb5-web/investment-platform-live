-- Small/mid-cap market tracker.
--   market_breadth_daily   - one row per ASX trading day: advancers, decliners,
--                            % advancing and % above 50-day EMA. Builds up a
--                            breadth history as the tracker is used.
--   market_tracker_levels  - support/resistance levels the adviser wants
--                            watched on the Small Ordinaries.

create table if not exists market_breadth_daily (
  trade_date date primary key,
  advancers integer not null,
  decliners integer not null,
  unchanged integer not null,
  pct_advancing numeric not null,
  pct_above_ema50 numeric,
  universe integer not null,
  created_at timestamptz not null default now()
);

create table if not exists market_tracker_levels (
  id uuid primary key default gen_random_uuid(),
  level numeric not null,
  label text not null,
  created_by text,
  created_at timestamptz not null default now()
);

insert into market_tracker_levels (level, label, created_by)
select 3046, 'Small Ords low, 26 Oct 2026', 'Sean Allitt'
where not exists (select 1 from market_tracker_levels);

alter table market_breadth_daily enable row level security;
alter table market_tracker_levels enable row level security;
drop policy if exists "Signed-in advisers only" on market_breadth_daily;
create policy "Signed-in advisers only" on market_breadth_daily for all to authenticated using (true) with check (true);
drop policy if exists "Signed-in advisers only" on market_tracker_levels;
create policy "Signed-in advisers only" on market_tracker_levels for all to authenticated using (true) with check (true);
