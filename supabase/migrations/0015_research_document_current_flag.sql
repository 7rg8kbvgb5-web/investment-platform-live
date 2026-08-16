-- Lets a "Top Ideas" / preferred-holdings upload automatically supersede
-- the previous one from the same source, rather than both sitting
-- alongside each other forever. Older uploads aren't deleted - just
-- marked no longer current, so the featured display (House Views) can
-- show only the latest list while history remains available if needed.

alter table research_documents
  add column if not exists is_current boolean not null default true;

comment on column research_documents.is_current is
  'For document_type = Top Ideas: false once a newer upload from the same source has superseded it. Always true for other document types.';
