-- Live sector health scoring, replacing the previous fully-static
-- 11-GICS-sector table that had nothing to do with what the model
-- portfolio actually holds. Scoped to only the sectors represented
-- among live model holdings, and re-derivable on demand via scan.

create table if not exists sector_health_scores (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null,
  sector text not null,
  earnings_revision_momentum numeric not null,
  earnings_breadth numeric not null,
  relative_strength numeric not null,
  valuation_opportunity numeric not null,
  house_view_overlay numeric not null,
  total_score numeric not null,
  recommendation text not null,
  rationale text,
  generated_at timestamptz not null default now()
);

create index if not exists sector_health_scores_scan_id_idx
  on sector_health_scores (scan_id);

create index if not exists sector_health_scores_generated_at_idx
  on sector_health_scores (generated_at desc);

alter table sector_health_scores enable row level security;

create policy "Allow full access to sector_health_scores"
  on sector_health_scores
  for all
  using (true)
  with check (true);
