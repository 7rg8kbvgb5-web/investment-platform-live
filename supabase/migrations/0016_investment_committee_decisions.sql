-- Investment Committee decision queue. Every proposed swap - a named
-- replacement for a security the model currently holds - lands here for a
-- formal committee decision, whether it was flagged by a Monitoring scan,
-- a Fund Review scan, or raised manually by an adviser.
--
-- Each row is the audit trail for one proposal: what was proposed and why,
-- what the committee decided, the rationale, who decided and when, and
-- whether the approved change has been applied to the house model.
-- Nothing here changes a client portfolio on its own.

create table if not exists investment_committee_decisions (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('monitoring', 'fund_review', 'manual')),
  source_alert_id uuid,
  asset_class text,
  current_code text not null,
  current_name text,
  proposed_code text not null,
  proposed_name text,
  title text not null,
  reasoning text not null,
  severity text not null default 'medium' check (severity in ('critical', 'high', 'medium', 'low')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'deferred')),
  decision_rationale text,
  decided_by text,
  decided_at timestamptz,
  applied_to_model boolean not null default false,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

-- One queue entry per scan alert, so re-syncing never duplicates.
create unique index if not exists investment_committee_decisions_source_alert_idx
  on investment_committee_decisions (source_alert_id)
  where source_alert_id is not null;

create index if not exists investment_committee_decisions_status_idx
  on investment_committee_decisions (status, created_at desc);

alter table investment_committee_decisions enable row level security;

create policy "Allow full access to investment_committee_decisions"
  on investment_committee_decisions
  for all
  using (true)
  with check (true);
