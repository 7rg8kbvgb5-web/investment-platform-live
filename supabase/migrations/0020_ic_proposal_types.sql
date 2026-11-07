-- Every input feeds the Investment Committee, not just named swaps.
--
-- The decision queue now holds three kinds of proposal:
--   swap       - replace a model holding with a named alternative (as before)
--   allocation - tilt an asset class's weight across the risk profiles,
--                raised from a Tactical View overweight/underweight call
--   review     - put a holding (or a sector's holdings) in front of the
--                committee because conviction has turned negative or the
--                sector's health score has deteriorated
-- source_key de-duplicates auto-raised items so re-running a scan never
-- floods the queue.

alter table investment_committee_decisions
  add column if not exists proposal_type text not null default 'swap',
  add column if not exists source_key text,
  add column if not exists risk_profiles text[],
  add column if not exists tilt_pp numeric,
  add column if not exists offset_asset_class text;

alter table investment_committee_decisions drop constraint if exists investment_committee_decisions_proposal_type_check;
alter table investment_committee_decisions
  add constraint investment_committee_decisions_proposal_type_check
    check (proposal_type in ('swap', 'allocation', 'review'));

alter table investment_committee_decisions drop constraint if exists investment_committee_decisions_source_check;
alter table investment_committee_decisions
  add constraint investment_committee_decisions_source_check
    check (source in ('monitoring', 'fund_review', 'manual', 'tactical', 'conviction', 'sector_health'));

alter table investment_committee_decisions alter column current_code drop not null;
alter table investment_committee_decisions alter column proposed_code drop not null;

create unique index if not exists investment_committee_decisions_source_key_idx
  on investment_committee_decisions (source_key)
  where source_key is not null;
