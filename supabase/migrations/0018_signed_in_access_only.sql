-- Locks the database to signed-in advisers only.
--
-- Until now every table allowed full access to anyone holding the public
-- (anon) key, which ships in the browser. After this:
--   - the browser can only read/write when an adviser is signed in
--   - server routes use the service-role key (server-only, bypasses RLS)
--   - anonymous requests get nothing
--
-- Covers every table in the public schema, including ones created in the
-- dashboard rather than by a migration. RUN THIS ONLY AFTER the sign-in
-- deploy is live and you've confirmed you can log in.

do $$
declare
  t record;
  p record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t.tablename loop
      execute format('drop policy %I on public.%I', p.policyname, t.tablename);
    end loop;
    execute format(
      'create policy "Signed-in advisers only" on public.%I for all to authenticated using (true) with check (true)',
      t.tablename
    );
  end loop;
end $$;

-- Research document storage: signed-in advisers only.
update storage.buckets set public = false where id = 'research-documents';

-- Remove any earlier (dashboard-created) policies on this bucket, which may
-- have allowed anonymous access.
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') like '%research-documents%' or coalesce(with_check, '') like '%research-documents%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

drop policy if exists "Signed-in advisers read research documents" on storage.objects;
drop policy if exists "Signed-in advisers upload research documents" on storage.objects;
drop policy if exists "Signed-in advisers manage research documents" on storage.objects;
drop policy if exists "Signed-in advisers delete research documents" on storage.objects;

create policy "Signed-in advisers read research documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'research-documents');
create policy "Signed-in advisers upload research documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'research-documents');
create policy "Signed-in advisers manage research documents"
  on storage.objects for update to authenticated
  using (bucket_id = 'research-documents');
create policy "Signed-in advisers delete research documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'research-documents');
