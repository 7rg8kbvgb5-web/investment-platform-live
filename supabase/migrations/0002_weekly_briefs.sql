-- Weekly research brief: stores the output of the Monday-morning
-- Anthropic-powered scan (macro events, Approved List security news,
-- best-in-class alternative flags) cross-referenced against the research
-- library above.

create table if not exists weekly_briefs (
  id uuid primary key default gen_random_uuid(),
  week_of date not null,
  macro_summary text not null,
  security_alerts jsonb not null default '[]',
  alternative_flags jsonb not null default '[]',
  referenced_document_ids uuid[] not null default '{}',
  raw_model_output text,
  generated_at timestamptz not null default now()
);

create index if not exists weekly_briefs_week_of_idx
  on weekly_briefs (week_of desc);

alter table weekly_briefs enable row level security;

create policy "Allow full access to weekly_briefs"
  on weekly_briefs
  for all
  using (true)
  with check (true);
