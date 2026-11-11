-- Client-facing commentary for the proposal, kept per security so an
-- adviser writes (or approves an AI draft of) each line once and it's reused
-- in every later proposal.
--   kind = 'buy'      why we recommend buying it (an outright new position)
--   kind = 'sell'     why we recommend selling it outright
--   kind = 'exposure' one line on what an ETF / listed or unlisted fund gives the portfolio

create table if not exists security_commentary (
  code text not null,
  kind text not null check (kind in ('buy', 'sell', 'exposure')),
  text text not null,
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (code, kind)
);

alter table security_commentary enable row level security;
drop policy if exists "Signed-in advisers only" on security_commentary;
create policy "Signed-in advisers only" on security_commentary for all to authenticated using (true) with check (true);
