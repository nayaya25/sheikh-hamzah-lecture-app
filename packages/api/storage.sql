-- Supabase Storage: a public 'media' bucket for lecture audio/video that the
-- admin uploads. Public read (the app streams the file); only admin editors
-- may upload/replace/delete. Run after schema.sql (in the SQL Editor). Idempotent.

-- Public bucket, 5 GB per-file ceiling (raise/lower to taste).
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 5368709120)
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit;

-- storage.objects already has RLS enabled by Supabase. (Re)create our policies.
drop policy if exists media_public_read on storage.objects;
drop policy if exists media_admin_insert on storage.objects;
drop policy if exists media_admin_update on storage.objects;
drop policy if exists media_admin_delete on storage.objects;

create policy media_public_read on storage.objects
  for select using (bucket_id = 'media');

create policy media_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_editor());

create policy media_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_editor())
  with check (bucket_id = 'media' and public.is_editor());

create policy media_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_editor());
