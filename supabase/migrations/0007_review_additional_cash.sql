-- Lets the adviser record extra cash a client wants to inject into the
-- new portfolio from elsewhere, as part of a saved review, alongside
-- the uploaded holdings and portfolio value it already carries.

alter table client_portfolio_reviews
  add column if not exists additional_cash text;
