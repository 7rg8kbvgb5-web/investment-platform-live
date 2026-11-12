-- System health (Nov 2026): every scheduled job run (the daily scans and the
-- weekly brief) records its outcome here, step by step, so the dashboard's
-- health banner can flag a failed scan instead of it only reaching the
-- server log. Safe to re-run.

create table if not exists system_job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  ok boolean not null,
  -- { "<step>": "ok" | "<error message>" }
  results jsonb not null default '{}'::jsonb,
  ran_at timestamptz not null default now()
);

create index if not exists system_job_runs_job_idx on system_job_runs (job, ran_at desc);

alter table system_job_runs enable row level security;
drop policy if exists "Signed-in advisers only" on system_job_runs;
create policy "Signed-in advisers only" on system_job_runs
  for all to authenticated using (true) with check (true);
