-- Remembered classifications for securities outside the model and Approved List.
--
-- When an adviser classifies a holding the platform didn't recognise (e.g. a
-- client's legacy stock, an unlisted fund, a bond listed by ISIN), the asset
-- class is saved here so every future statement containing that code is
-- recognised automatically. Deliberately separate from approved_securities:
-- knowing what a security IS doesn't mean the house has approved it.

create table if not exists security_classifications (
  code text primary key,
  name text,
  asset_class text not null,
  classified_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table security_classifications enable row level security;
drop policy if exists "Signed-in advisers only" on security_classifications;
create policy "Signed-in advisers only" on security_classifications for all to authenticated using (true) with check (true);
