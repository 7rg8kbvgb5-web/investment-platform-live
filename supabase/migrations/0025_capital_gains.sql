-- Capital gains/losses estimates.
--   cgt_settings    - per review: entity type, rates, carried-forward losses,
--                     cost base and 12-month status per holding, and whether
--                     the estimate is included in the proposal
--   tax_reference   - ATO tax rates approved for use in estimates; the latest
--                     row is used (the platform ships with a verified default)

alter table client_portfolio_reviews
  add column if not exists cgt_settings jsonb;

create table if not exists tax_reference (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null,
  approved_by text,
  created_at timestamptz not null default now()
);

alter table tax_reference enable row level security;
drop policy if exists "Signed-in advisers only" on tax_reference;
create policy "Signed-in advisers only" on tax_reference for all to authenticated using (true) with check (true);
