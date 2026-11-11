-- Platform review fixes (Nov 2026). Four independent parts; safe to re-run.

-- 1. Daily price-history cache. Each security's 12-month price history is
--    fetched from EODHD at most once a day and reused, so Data Analytics
--    stays on real data within the price plan's daily call limit.
create table if not exists price_history_cache (
  code text primary key,
  closes jsonb not null,          -- array of adjusted closes, oldest first
  first_date date,
  last_date date,
  fetched_at timestamptz not null default now()
);

-- 2. Record of every proposal issued: the PDF (stored under the review
--    reference - no client name) plus a snapshot of exactly what it was
--    based on, for the advice file.
create table if not exists proposal_records (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null,
  review_reference text not null,
  risk_profile text,
  model_version integer,
  approach text,
  total_value numeric,
  storage_path text,
  snapshot jsonb not null,
  generated_by text,
  generated_at timestamptz not null default now()
);
create index if not exists proposal_records_review_idx on proposal_records (review_id, generated_at desc);

-- 3. Remembered income data for securities outside the model (yield and
--    franking), so a client's income today can be compared with the
--    recommended portfolio's.
create table if not exists security_income (
  code text primary key,
  name text,
  yield numeric,
  franking_pct numeric,
  note text,
  updated_at timestamptz not null default now()
);

-- 4. Client objectives on the review (no personal details).
alter table client_portfolio_reviews add column if not exists objectives jsonb;

-- Signed-in advisers only (server routes use the service role).
alter table price_history_cache enable row level security;
alter table proposal_records enable row level security;
alter table security_income enable row level security;
drop policy if exists "Signed-in advisers only" on price_history_cache;
drop policy if exists "Signed-in advisers only" on proposal_records;
drop policy if exists "Signed-in advisers only" on security_income;
create policy "Signed-in advisers only" on price_history_cache for all to authenticated using (true) with check (true);
create policy "Signed-in advisers only" on proposal_records for all to authenticated using (true) with check (true);
create policy "Signed-in advisers only" on security_income for all to authenticated using (true) with check (true);
