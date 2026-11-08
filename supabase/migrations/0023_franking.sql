-- Franking: each model holding's expected franking level (0-100%), so
-- income projections can show franking credits and grossed-up income
-- alongside the cash yield.

alter table model_portfolio_securities
  add column if not exists franking_pct numeric check (franking_pct is null or (franking_pct >= 0 and franking_pct <= 100));

alter table model_change_log drop constraint if exists model_change_log_change_type_check;
alter table model_change_log
  add constraint model_change_log_change_type_check check (change_type in (
    'security_added', 'security_removed', 'security_swapped',
    'in_class_weight', 'asset_class_weight', 'yield', 'holding_type', 'franking'
  ));
