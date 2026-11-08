-- Adviser adjustments to individual recommended trades on the Construction
-- tab (units, or dollars where there's no live price), so a client's
-- portfolio doesn't have to be an exact replica of the model.

alter table client_portfolio_reviews
  add column if not exists trade_overrides jsonb not null default '{}'::jsonb;
