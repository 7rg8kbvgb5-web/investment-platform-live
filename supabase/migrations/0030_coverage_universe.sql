-- Coverage universe spreadsheets (e.g. Ord Minnett's "OML Universe" export).
-- One upload carries the broker's full current set of ratings; the newest
-- upload from a source supersedes the previous one (is_current), the same
-- way Top Ideas does. Each security also keeps the broker's risk rating
-- and the date its rating was last updated.

alter table research_documents drop constraint if exists research_documents_document_type_check;
alter table research_documents
  add constraint research_documents_document_type_check
    check (document_type in ('Top Ideas', 'Coverage Universe', 'Research Note', 'Sector Report', 'Company Update', 'Model Portfolio Note', 'Other'));

alter table research_document_securities
  add column if not exists risk text,
  add column if not exists rating_date date;

comment on column research_documents.is_current is
  'For document_type Top Ideas or Coverage Universe: false once a newer upload of the same type from the same source has superseded it. Always true for other document types.';
