-- Adds a fourth fund review category: a possible better risk-adjusted
-- alternative fund within the same asset class/strategy, mirroring the
-- structured suggested-alternative pattern already used in Monitoring
-- (migration 0006) - a real, named replacement fund, not a vague
-- underperformance flag.

alter table fund_review_alerts
  drop constraint if exists fund_review_alerts_category_check;

alter table fund_review_alerts
  add constraint fund_review_alerts_category_check
    check (category in ('manager', 'performance', 'structural', 'alternative'));

alter table fund_review_alerts
  add column if not exists suggested_alternative_code text,
  add column if not exists suggested_alternative_name text;

comment on column fund_review_alerts.suggested_alternative_code is
  'Ticker/APIR code of the specific alternative fund being flagged, for category=alternative alerts only.';
comment on column fund_review_alerts.suggested_alternative_name is
  'Name of the specific alternative fund being flagged, for category=alternative alerts only.';
