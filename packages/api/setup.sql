-- Althaqalayn Lectures — Supabase (Postgres) schema
-- Source of truth for the content model in @althaqalayn/types.
--
-- Access model (README): the public mobile app has NO auth and reads only
-- PUBLISHED content; the admin console is login-protected and does full CRUD.
-- RLS enforces this at the database layer, so a forgotten `.eq('status', …)`
-- filter can never leak drafts to the app.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────
create type transcript_status as enum ('complete', 'auto-needs-review', 'missing');
create type content_language  as enum ('en', 'ha');
create type user_role         as enum ('owner', 'editor', 'viewer');

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin accounts (public app has none). Mirrors auth.users, adds role + name.
-- ─────────────────────────────────────────────────────────────────────────────
create table admin_users (
  id    uuid primary key references auth.users (id) on delete cascade,
  name  text not null,
  email text not null unique,
  role  user_role not null default 'editor'
);

-- Helpers: what is the current request's admin capability?
--   is_admin()  — any admin account (read access to everything, incl. drafts)
--   is_editor() — owner or editor (may create/update/delete content)
--   is_owner()  — owner only (may manage the admin roster + roles)
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users where id = auth.uid());
$$;

create or replace function is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users
                 where id = auth.uid() and role in ('owner', 'editor'));
$$;

create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users where id = auth.uid() and role = 'owner');
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Content tables. Two-level model: Collection → Lecture.
-- A collection's `kind` drives how it's laid out: occasion/topic collections
-- group their lectures by `group_label`; series collections show a flat
-- ordered list (see `lectures.sort`).
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

create table albums (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  date       date not null,
  event      text,
  cover      text,
  published  boolean not null default false,
  created_at timestamptz not null default now()
);

create table photos (
  id       uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums (id) on delete cascade,
  url      text not null,
  caption  text,
  width    int,
  height   int,
  position int not null default 0
);
create index photos_album_idx on photos (album_id, position);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- Public (anon) role: read published content only. Admins: full read/write.
-- ─────────────────────────────────────────────────────────────────────────────
alter table admin_users  enable row level security;
alter table collections  enable row level security;
alter table lectures     enable row level security;
alter table transcripts  enable row level security;
alter table albums       enable row level security;
alter table photos       enable row level security;

-- Content: any admin may READ everything (including drafts); only editors/owners
-- may WRITE. Policies are OR-combined per command, so the `for select` read
-- policy and the `for all` write policy compose to "viewers read, editors write".
create policy read_collections on collections for select using (is_admin());
create policy write_collections on collections for all   using (is_editor()) with check (is_editor());
create policy read_lectures    on lectures    for select using (is_admin());
create policy write_lectures   on lectures    for all    using (is_editor()) with check (is_editor());
create policy read_transcripts on transcripts for select using (is_admin());
create policy write_transcripts on transcripts for all   using (is_editor()) with check (is_editor());
create policy read_albums      on albums      for select using (is_admin());
create policy write_albums     on albums      for all    using (is_editor()) with check (is_editor());
create policy read_photos      on photos      for select using (is_admin());
create policy write_photos     on photos      for all    using (is_editor()) with check (is_editor());

-- Admin roster: each admin may read their own row; only owners may read the full
-- list or add/remove admins and change roles. Since no policy grants a non-owner
-- write on admin_users, a non-owner cannot escalate their own `role`.
create policy read_admins   on admin_users for select using (id = auth.uid() or is_owner());
create policy manage_admins on admin_users for all    using (is_owner()) with check (is_owner());

-- Public read of published content. Lectures gate on status; children gate on
-- their parent being publicly visible.
create policy public_read_collections on collections for select using (true);

create policy public_read_published_lectures on lectures for select
  using (status = 'published');

create policy public_read_transcripts on transcripts for select
  using (exists (select 1 from lectures l
                 where l.id = transcripts.lecture_id and l.status = 'published'));

create policy public_read_published_albums on albums for select
  using (published = true);

create policy public_read_album_photos on photos for select
  using (exists (select 1 from albums a
                 where a.id = photos.album_id and a.published = true));

-- ─────────────────────────────────────────────────────────────────────────────
-- Role grants (see grants.sql)
-- ─────────────────────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;

-- Public app (anon): read-only on content. RLS narrows this to published rows.
grant select on collections, lectures, transcripts, albums, photos
  to anon, authenticated;

-- Admin console (authenticated): full DML on content. RLS enforces editor/owner.
grant insert, update, delete on collections, lectures, transcripts, albums, photos
  to authenticated;

-- Admin roster: authenticated only (RLS restricts to owner / self).
grant select, insert, update, delete on admin_users to authenticated;

-- Sample gallery content for the Althaqalayn catalog — run AFTER schema.sql.
-- Mirrors the mobile app's bundled sample data so a connected app looks the same,
-- now backed by the real database. Safe to re-run (idempotent via fixed UUIDs +
-- ON CONFLICT DO NOTHING).
--
-- No `collections`/`lectures` seed data — the two-level content model starts
-- empty; content is entered through the admin console.

-- ── Gallery ──────────────────────────────────────────────────────────────────
insert into albums (id, title, date, event, published) values
  ('e0000000-0000-0000-0000-000000000001', 'Maulud an-Nabī ﷺ 1445', '2024-10-01', 'Maulud an-Nabī', true)
on conflict (id) do nothing;

insert into photos (id, album_id, url, position) values
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/alt1/600/800', 0),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/alt2/600/900', 1),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/alt3/600/700', 2)
on conflict (id) do nothing;
