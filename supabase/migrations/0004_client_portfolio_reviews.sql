-- Lets an adviser stop work on a client's portfolio review/proposal and
-- pick it back up later without losing anything. Previously this state
-- (uploaded holdings, risk profile choice, portfolio value, and any
-- bespoke client-specific weight overrides) lived only in the browser
-- tab's memory and was gone the moment it was closed - the house model
-- itself was always safe in Supabase, but the client-specific working
-- file was not. Identified by free-text client name, per Sean's choice.

create table if not exists client_portfolio_reviews (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  risk_override text,
  manual_portfolio_value text,
  holdings jsonb not null default '[]',
  extraction_meta jsonb not null default '{}',
  asset_class_overrides jsonb not null default '{}',
  holding_overrides jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_portfolio_reviews_client_name_idx
  on client_portfolio_reviews (client_name);

create index if not exists client_portfolio_reviews_updated_at_idx
  on client_portfolio_reviews (updated_at desc);

alter table client_portfolio_reviews enable row level security;

create policy "Allow full access to client_portfolio_reviews"
  on client_portfolio_reviews
  for all
  using (true)
  with check (true);
