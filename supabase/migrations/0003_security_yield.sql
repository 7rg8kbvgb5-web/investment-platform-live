-- Adds a per-security yield (%) to the shared core model portfolio
-- securities table, so aggregate income can be rolled up per holding,
-- per asset class, and across the whole portfolio. Sourced from a live
-- web lookup (ticker auto-fill) when a security is added, and editable
-- by the adviser afterwards like any other field.

alter table model_portfolio_securities
  add column if not exists yield numeric;

comment on column model_portfolio_securities.yield is
  'Trailing/indicative distribution yield, percent (e.g. 5.2 for 5.2%). Nullable - not every security has a stated yield.';
