-- Research documents are now read automatically on upload. Every security
-- a document covers is stored as its own row - with that document's
-- rating, recommendation, price target, and whether it's on a Top Ideas
-- list - so one Ord Minnett or Barrenjoey note can carry different views
-- on different stocks. These rows feed conviction ratings and the Top
-- Ideas vs model comparison.

create table if not exists research_document_securities (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references research_documents(id) on delete cascade,
  code text not null,
  name text,
  rating text,
  recommendation text,
  price_target numeric,
  is_top_idea boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists research_document_securities_code_idx on research_document_securities (upper(code));
create index if not exists research_document_securities_document_idx on research_document_securities (document_id);

alter table research_document_securities enable row level security;
drop policy if exists "Signed-in advisers only" on research_document_securities;
create policy "Signed-in advisers only" on research_document_securities for all to authenticated using (true) with check (true);

-- Top Ideas not held in the model can be raised for committee review.
alter table investment_committee_decisions drop constraint if exists investment_committee_decisions_source_check;
alter table investment_committee_decisions
  add constraint investment_committee_decisions_source_check
    check (source in ('monitoring', 'fund_review', 'manual', 'tactical', 'conviction', 'sector_health', 'house_view'));
