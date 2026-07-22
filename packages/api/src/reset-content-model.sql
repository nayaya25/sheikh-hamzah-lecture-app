-- Run in Supabase SQL Editor. DESTRUCTIVE to programs/series/categories/
-- lectures/transcripts; preserves admin_users/albums/photos. No seed data.
--
-- One-time migration from the old Program → Series → Episode model to the
-- new two-level Collection → Lecture model. `transcripts` references
-- `lectures`, so it is dropped and recreated empty (its rows can't be
-- carried over — there's no lecture to attach them to). `admin_users`,
-- `albums`, and `photos` are untouched: not dropped, not recreated.
--
-- The `is_admin()`/`is_editor()`/`is_owner()` helper functions and the
-- `content_language`/`transcript_status`/`user_role` enum types already
-- exist in the database (created by the original schema.sql) and are not
-- redefined here.
--
-- The CREATE/RLS/GRANT statements below are copied verbatim from the
-- rewritten packages/api/src/schema.sql and packages/api/grants.sql — do not
-- hand-edit one without the other.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Drop the old content tables (and anything depending on them).
-- ─────────────────────────────────────────────────────────────────────────────
drop table if exists transcripts cascade;
drop table if exists lectures cascade;
drop table if exists series cascade;
drop table if exists programs cascade;
drop table if exists categories cascade;

-- ─────────────────────────────────────────────────────────────────────────────
-- Create the new two-level content model.
-- ─────────────────────────────────────────────────────────────────────────────
create table collections (
  id             uuid primary key default gen_random_uuid(),
  title_en       text not null,
  title_ha       text,
  kind           text not null check (kind in ('occasion', 'series', 'topic')),
  language       text not null default 'ha',
  cover_from     text,                   -- gradient [from, to]
  cover_to       text,
  cover_arabic   text,
  description_en text,
  description_ha text,
  featured       boolean not null default false,
  position       int not null default 0, -- order in browse lists
  created_at     timestamptz not null default now()
);

create table lectures (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections (id) on delete cascade,
  title_en      text not null,
  title_ha      text,
  type          text not null check (type in ('audio', 'video', 'text')),
  language      text not null default 'ha',
  group_label   text,                   -- sub-heading within an occasion/topic collection
  sort          int not null default 0, -- order within the collection
  media_url     text,                   -- audio/video source
  body_en       text,                   -- reader body for type = 'text'
  body_ha       text,
  duration      int,                    -- seconds; null for text
  date          date not null,
  year          text,
  status        text not null default 'published' check (status in ('draft', 'published', 'scheduled')),
  scheduled_for timestamptz,            -- when status = 'scheduled'
  featured      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index lectures_collection_idx on lectures (collection_id, sort);

create table transcripts (
  id         uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references lectures (id) on delete cascade,
  language   content_language not null,
  status     transcript_status not null default 'missing',
  body_en    text,
  body_ha    text,
  unique (lecture_id, language)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (collections/lectures/transcripts only — admin_users,
-- albums, photos already have RLS enabled and their policies are untouched).
-- ─────────────────────────────────────────────────────────────────────────────
alter table collections enable row level security;
alter table lectures    enable row level security;
alter table transcripts enable row level security;

create policy read_collections on collections for select using (is_admin());
create policy write_collections on collections for all   using (is_editor()) with check (is_editor());
create policy read_lectures    on lectures    for select using (is_admin());
create policy write_lectures   on lectures    for all    using (is_editor()) with check (is_editor());
create policy read_transcripts on transcripts for select using (is_admin());
create policy write_transcripts on transcripts for all   using (is_editor()) with check (is_editor());

create policy public_read_collections on collections for select using (true);

create policy public_read_published_lectures on lectures for select
  using (status = 'published');

create policy public_read_transcripts on transcripts for select
  using (exists (select 1 from lectures l
                 where l.id = transcripts.lecture_id and l.status = 'published'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Role grants (collections/lectures/transcripts only).
-- ─────────────────────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;

grant select on collections, lectures, transcripts to anon, authenticated;

grant insert, update, delete on collections, lectures, transcripts to authenticated;

commit;
