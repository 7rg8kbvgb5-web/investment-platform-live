-- Research library: manual upload of Ord Minnett and Barrenjoey research
-- documents, tagged by ticker and sector for retrieval during proposal
-- construction and the weekly research brief.

create table if not exists research_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text not null check (source in ('Ord Minnett', 'Barrenjoey', 'Other')),
  document_type text not null default 'Research Note'
    check (document_type in ('Research Note', 'Sector Report', 'Company Update', 'Model Portfolio Note', 'Other')),
  tickers text[] not null default '{}',
  sectors text[] not null default '{}',
  summary text,
  storage_path text not null,
  file_name text not null,
  file_size_bytes bigint,
  uploaded_by text,
  published_at date,
  created_at timestamptz not null default now()
);

create index if not exists research_documents_tickers_idx
  on research_documents using gin (tickers);

create index if not exists research_documents_sectors_idx
  on research_documents using gin (sectors);

create index if not exists research_documents_created_at_idx
  on research_documents (created_at desc);

alter table research_documents enable row level security;

-- Single-firm internal tool: any authenticated (or anon, given the anon key
-- is only ever used from the platform itself) request may read/write.
-- Tighten this if the platform grows beyond Sean/Louie's direct use.
create policy "Allow full access to research_documents"
  on research_documents
  for all
  using (true)
  with check (true);
