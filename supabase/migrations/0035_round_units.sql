-- Per-client presentation choice: round proposed trades to the nearest 10 units.
alter table client_portfolio_reviews add column if not exists round_units boolean not null default false;
