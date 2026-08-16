-- Lets each model security be classified by holding type, so the
-- platform can tell "this is a fund" (and whether listed or unlisted)
-- apart from a direct equity, direct bond, or cash position. Needed for
-- Fund Reviews to scope itself to actual funds held, rather than every
-- security in the model. Defaults existing rows to 'direct_equity' -
-- the previous implicit assumption - so nothing changes until an
-- adviser reclassifies a holding.

alter table model_portfolio_securities
  add column if not exists holding_type text not null default 'direct_equity'
    check (holding_type in ('direct_equity', 'listed_fund', 'unlisted_fund', 'direct_bond', 'cash', 'other'));

comment on column model_portfolio_securities.holding_type is
  'direct_equity | listed_fund | unlisted_fund | direct_bond | cash | other - lets Fund Reviews scope itself to actual funds held.';
