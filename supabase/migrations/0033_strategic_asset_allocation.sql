-- Strategic asset allocation (Nov 2026): the approved, "correct" asset-class
-- weights for each risk profile, kept separately from the live working
-- weights in risk_profile_asset_class_weights. The Risk Profile tab's
-- "Reset to strategic allocation" button copies these back over the live
-- weights; "Save as strategic allocation" records them (only allowed when the
-- profile totals 100%). One set per adviser model. Safe to re-run.

create table if not exists risk_profile_strategic_weights (
  model_id text not null default 'sean',
  risk_profile text not null,
  asset_class text not null,
  target_weight numeric not null,
  saved_by text,
  updated_at timestamptz not null default now(),
  primary key (model_id, risk_profile, asset_class)
);

alter table risk_profile_strategic_weights enable row level security;
drop policy if exists "Signed-in advisers only" on risk_profile_strategic_weights;
create policy "Signed-in advisers only" on risk_profile_strategic_weights
  for all to authenticated using (true) with check (true);

-- Seed from today's live weights, but only for profiles that currently total
-- exactly 100% - a profile that is over or under invested is left unset so
-- the adviser corrects it and saves it deliberately.
insert into risk_profile_strategic_weights (model_id, risk_profile, asset_class, target_weight, saved_by)
select w.model_id, w.risk_profile, w.asset_class, w.target_weight, 'Seeded from live weights'
from risk_profile_asset_class_weights w
join (
  select model_id, risk_profile
  from risk_profile_asset_class_weights
  group by model_id, risk_profile
  having abs(sum(target_weight) - 100) < 0.05
) balanced on balanced.model_id = w.model_id and balanced.risk_profile = w.risk_profile
on conflict (model_id, risk_profile, asset_class) do nothing;

-- Allow the change log to record a reset.
alter table model_change_log drop constraint if exists model_change_log_change_type_check;
alter table model_change_log add constraint model_change_log_change_type_check check (change_type in (
  'security_added', 'security_removed', 'security_swapped',
  'in_class_weight', 'asset_class_weight', 'yield', 'holding_type', 'franking',
  'strategic_allocation_saved', 'strategic_allocation_reset'
));
