-- Which securities' briefs this client's proposal includes (the adviser ticks
-- them on the Client Advice tab). The brief text itself lives in
-- security_commentary and is shared across clients.
alter table client_portfolio_reviews add column if not exists commentary_selection jsonb;
