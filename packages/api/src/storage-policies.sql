-- Supabase Storage policies for the `media` bucket (audio/video/cover uploads).
-- Run ONCE in the Supabase SQL Editor. Our schema.sql covers the content TABLES;
-- Storage lives in the `storage` schema and needs its own bucket + RLS policies.
--
-- Symptom this fixes: bulk/media upload fails with
--   "new row violates row-level security policy"
-- because `storage.objects` has RLS enabled but no policy lets an authenticated
-- admin INSERT (upload) into the `media` bucket.
--
-- Access model: the public app reads media freely (a public archive); only
-- logged-in admins (the only authenticated users — the public app has no auth)
-- may upload/replace/delete. The bucket is public so getPublicUrl() links work.

-- 1) Ensure the bucket exists and is public (idempotent).
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- 2) Policies on storage.objects, scoped to this bucket. Drop-if-exists first so
--    this whole script is safe to re-run.
drop policy if exists "media_public_read"          on storage.objects;
drop policy if exists "media_authenticated_insert" on storage.objects;
drop policy if exists "media_authenticated_update" on storage.objects;
drop policy if exists "media_authenticated_delete" on storage.objects;

-- Anyone (incl. the anon mobile app) may READ objects in the media bucket.
create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');

-- Only logged-in admins may write. (The console is login-gated; the anon key has
-- no session, so it cannot upload.)
create policy "media_authenticated_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media');

create policy "media_authenticated_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media')
  with check (bucket_id = 'media');

create policy "media_authenticated_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media');
