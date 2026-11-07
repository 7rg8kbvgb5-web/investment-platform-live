-- One approved list, and a model that remembers its own history.
--
-- 1. approved_securities replaces the old static security-master file.
--    It's the universe the model may draw on: every model holding must be
--    on it (enforced in the app - adding to the model adds it here), and
--    an Investment Committee-approved swap adds the replacement here too.
--
-- 2. model_change_log records every edit to the house model - securities
--    added, removed or swapped, in-class weights, asset-class weights per
--    risk profile, yields and holding types - with before/after values,
--    who made it and when.
--
-- 3. model_versions are published snapshots of the whole model (every
--    security and every risk profile's weights). Client reviews record
--    the version they were built against, so when the model moves on you
--    can see exactly whose advice is out of date. Version 1 is seeded
--    from the model as it stands today.

create table if not exists approved_securities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  asset_class text,
  sector text,
  status text not null default 'approved' check (status in ('approved', 'watchlist', 'under_review', 'removed')),
  notes text,
  added_by text,
  ic_decision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table approved_securities enable row level security;
create policy "Signed-in advisers only" on approved_securities for all to authenticated using (true) with check (true);

-- Seed: the old static list, then everything the model holds today.
insert into approved_securities (code, name, sector, status)
values
  ('BHP', 'BHP Group', 'Materials', 'approved'),
  ('NST', 'Northern Star Resources', 'Materials', 'approved'),
  ('MQG', 'Macquarie Group', 'Financials', 'approved'),
  ('CSL', 'CSL Limited', 'Healthcare', 'approved')
on conflict (code) do nothing;

update approved_securities set notes = 'Carried over from the original static Approved List.' where notes is null;

insert into approved_securities (code, name, asset_class, sector, status, notes)
select distinct on (upper(code)) upper(code), name, asset_class, sector, 'approved', 'Held in the model portfolio when the Approved List moved to the database.'
from model_portfolio_securities
on conflict (code) do update set asset_class = coalesce(approved_securities.asset_class, excluded.asset_class);

create table if not exists model_change_log (
  id uuid primary key default gen_random_uuid(),
  change_type text not null check (change_type in (
    'security_added', 'security_removed', 'security_swapped',
    'in_class_weight', 'asset_class_weight', 'yield', 'holding_type'
  )),
  risk_profile text,
  asset_class text,
  code text,
  before_value jsonb,
  after_value jsonb,
  description text not null,
  changed_by text,
  ic_decision_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists model_change_log_created_at_idx on model_change_log (created_at desc);
alter table model_change_log enable row level security;
create policy "Signed-in advisers only" on model_change_log for all to authenticated using (true) with check (true);

create table if not exists model_versions (
  version integer primary key,
  summary text not null,
  published_by text,
  ic_decision_id uuid,
  snapshot jsonb not null,
  published_at timestamptz not null default now()
);

alter table model_versions enable row level security;
create policy "Signed-in advisers only" on model_versions for all to authenticated using (true) with check (true);

insert into model_versions (version, summary, published_by, snapshot)
select 1,
  'Baseline - the model as it stood when version tracking began.',
  'System',
  jsonb_build_object(
    'securities', coalesce((select jsonb_agg(to_jsonb(s) order by s.asset_class, s.display_order) from model_portfolio_securities s), '[]'::jsonb),
    'weights', coalesce((select jsonb_agg(to_jsonb(w)) from risk_profile_asset_class_weights w), '[]'::jsonb)
  )
where not exists (select 1 from model_versions);

alter table client_portfolio_reviews
  add column if not exists model_version integer;
