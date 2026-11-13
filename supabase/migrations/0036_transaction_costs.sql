-- Per-client transaction cost basis for proposals: flat $ per trade, or % of trade value with a minimum, optional GST.
alter table client_portfolio_reviews add column if not exists transaction_costs jsonb;
