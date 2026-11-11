-- Adviser models (Nov 2026): each adviser can run their own model portfolio.
--
-- Existing data becomes Sean's model ('sean'). Another adviser creates their
-- own from the Portfolios page (a copy of the current model to start from).
-- Each adviser's Investment Committee queue, version history and change log
-- are their own; client reviews record which model they're built against.
-- Proposals still present every model to the client as the Ord Minnett
-- house model. Safe to re-run.

create table if not exists portfolio_models (
  id text primary key,
  adviser_name text not null,
  owner_email text,
  copied_from text,
  created_at timestamptz not null default now()
);
insert into portfolio_models (id, adviser_name) values ('sean', 'Sean Allitt') on conflict (id) do nothing;

alter table model_portfolio_securities add column if not exists model_id text not null default 'sean';
alter table risk_profile_asset_class_weights add column if not exists model_id text not null default 'sean';
alter table model_change_log add column if not exists model_id text not null default 'sean';
alter table model_versions add column if not exists model_id text not null default 'sean';
alter table investment_committee_decisions add column if not exists model_id text not null default 'sean';
alter table client_portfolio_reviews add column if not exists model_id text not null default 'sean';

create index if not exists model_portfolio_securities_model_idx on model_portfolio_securities (model_id);
create index if not exists model_versions_model_idx on model_versions (model_id, version desc);
create index if not exists model_change_log_model_idx on model_change_log (model_id, created_at desc);

-- Risk profile weights: one row per model + profile + asset class. The old
-- uniqueness rule (profile + asset class) was created outside migrations, so
-- find and replace whatever is there.
do $$
declare
  c record;
  i record;
begin
  -- Drop any unique or primary-key rule built on (risk_profile, asset_class)
  -- without model_id. A primary key on an "id" column is left alone.
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.risk_profile_asset_class_weights'::regclass
      and con.contype in ('u', 'p')
      and exists (
        select 1 from pg_attribute a
        where a.attrelid = con.conrelid and a.attnum = any (con.conkey) and a.attname = 'risk_profile'
      )
      and not exists (
        select 1 from pg_attribute a
        where a.attrelid = con.conrelid and a.attnum = any (con.conkey) and a.attname = 'model_id'
      )
  loop
    execute format('alter table public.risk_profile_asset_class_weights drop constraint %I', c.conname);
  end loop;
  for i in
    select indexname from pg_indexes
    where schemaname = 'public' and tablename = 'risk_profile_asset_class_weights'
      and indexdef ilike '%unique%' and indexdef ilike '%risk_profile%' and indexdef not ilike '%model_id%'
  loop
    execute format('drop index if exists public.%I', i.indexname);
  end loop;
end $$;
create unique index if not exists risk_profile_weights_model_key
  on risk_profile_asset_class_weights (model_id, risk_profile, asset_class);

-- Model securities: the same code may appear in both advisers' models.
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.model_portfolio_securities'::regclass and contype = 'u'
  loop
    execute format('alter table public.model_portfolio_securities drop constraint %I', c.conname);
  end loop;
end $$;

-- IC queue: one entry per scan alert / source key per model (the same
-- alert can affect both advisers' models).
drop index if exists investment_committee_decisions_source_alert_idx;
drop index if exists investment_committee_decisions_source_key_idx;
create unique index if not exists ic_decisions_model_source_alert_idx
  on investment_committee_decisions (model_id, source_alert_id) where source_alert_id is not null;
create unique index if not exists ic_decisions_model_source_key_idx
  on investment_committee_decisions (model_id, source_key) where source_key is not null;

alter table portfolio_models enable row level security;
drop policy if exists "Signed-in advisers only" on portfolio_models;
create policy "Signed-in advisers only" on portfolio_models for all to authenticated using (true) with check (true);
