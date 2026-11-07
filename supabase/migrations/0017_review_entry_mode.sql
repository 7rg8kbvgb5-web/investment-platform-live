-- Lets a saved client review be a "new money" lump-sum investment with no
-- existing portfolio, rather than always an uploaded statement. For these,
-- additional_cash holds the lump sum and holdings is empty.

alter table client_portfolio_reviews
  add column if not exists entry_mode text not null default 'portfolio'
    check (entry_mode in ('portfolio', 'new-money'));
