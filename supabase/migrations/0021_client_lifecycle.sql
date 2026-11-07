-- Client register and advice lifecycle. Each saved client review becomes a
-- client record with a status - in progress, proposed, implemented - so the
-- platform can monitor clients after advice, not just while it's prepared.
--   advice_approach   - 'rebalance' or 'new-cash' (invest new money without selling)
--   adviser_notes     - the adviser's own commentary for the proposal
--   proposal_snapshot - the advice exactly as proposed (frozen at the time)

alter table client_portfolio_reviews
  add column if not exists status text not null default 'in_progress',
  add column if not exists advice_approach text,
  add column if not exists adviser_notes text,
  add column if not exists proposal_snapshot jsonb,
  add column if not exists proposed_at timestamptz,
  add column if not exists implemented_at timestamptz;

alter table client_portfolio_reviews drop constraint if exists client_portfolio_reviews_status_check;
alter table client_portfolio_reviews
  add constraint client_portfolio_reviews_status_check
    check (status in ('in_progress', 'proposed', 'implemented'));

alter table client_portfolio_reviews drop constraint if exists client_portfolio_reviews_advice_approach_check;
alter table client_portfolio_reviews
  add constraint client_portfolio_reviews_advice_approach_check
    check (advice_approach is null or advice_approach in ('rebalance', 'new-cash'));
