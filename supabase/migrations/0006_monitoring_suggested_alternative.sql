-- The 'alternative' category already asked the model to name a specific
-- replacement security in the free-text summary, but that meant it was
-- unreliable to display prominently or guarantee is always present.
-- These columns make the suggested alternative a proper structured
-- field: only populated for category = 'alternative' alerts.

alter table investment_monitoring_alerts
  add column if not exists suggested_alternative_code text,
  add column if not exists suggested_alternative_name text;

comment on column investment_monitoring_alerts.suggested_alternative_code is
  'Ticker of the specific alternative security being flagged, for category=alternative alerts only.';
comment on column investment_monitoring_alerts.suggested_alternative_name is
  'Name of the specific alternative security being flagged, for category=alternative alerts only.';
