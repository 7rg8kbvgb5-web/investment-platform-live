-- Deep-dive due diligence reviews for a NEW investment being considered
-- (an IPO, a new unlisted fund - credit, alts, hedge, infrastructure,
-- etc) - distinct from Monitoring (existing model holdings) and Fund
-- Reviews (funds already held). One row per completed deep dive, kept
-- so past reviews can be revisited rather than only living in the
-- moment they were run.

create table if not exists investment_deep_dive_reviews (
  id uuid primary key default gen_random_uuid(),
  subject_name text not null,
  subject_type text not null check (subject_type in ('ipo_listed', 'unlisted_fund', 'other')),
  summary text not null,
  sections jsonb not null default '[]',
  key_risks jsonb not null default '[]',
  raw_model_output text,
  requested_by text,
  generated_at timestamptz not null default now()
);

create index if not exists investment_deep_dive_reviews_generated_at_idx
  on investment_deep_dive_reviews (generated_at desc);

alter table investment_deep_dive_reviews enable row level security;

create policy "Allow full access to investment_deep_dive_reviews"
  on investment_deep_dive_reviews
  for all
  using (true)
  with check (true);
