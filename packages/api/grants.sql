-- Role privileges for the Supabase API roles. RLS (schema.sql) decides WHICH
-- rows each role sees; these GRANTs give the roles permission to touch the
-- tables at all. Run after schema.sql. Safe to re-run.

grant usage on schema public to anon, authenticated;

-- Public app (anon): read-only on content. RLS narrows this to published rows.
grant select on collections, lectures, transcripts, albums, photos
  to anon, authenticated;

-- Admin console (authenticated): full DML on content. RLS enforces editor/owner.
grant insert, update, delete on collections, lectures, transcripts, albums, photos
  to authenticated;

-- Admin roster: authenticated only (RLS restricts to owner / self).
grant select, insert, update, delete on admin_users to authenticated;
