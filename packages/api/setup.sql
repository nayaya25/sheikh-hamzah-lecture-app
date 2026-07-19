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
create type media_type       as enum ('audio', 'video', 'text');
create type lecture_scope     as enum ('series', 'single');
create type publish_status    as enum ('published', 'draft', 'scheduled');
create type series_kind       as enum ('recency', 'occasion', 'topic', 'book');
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
-- Content tables. Program → per-year Series → Episode.
-- ─────────────────────────────────────────────────────────────────────────────
create table programs (
  id             uuid primary key default gen_random_uuid(),
  title_en       text not null,
  title_ha       text,
  arabic         text,
  description_en text,
  description_ha text,
  created_at     timestamptz not null default now()
);

create table series (
  id             uuid primary key default gen_random_uuid(),
  program_id     uuid references programs (id) on delete set null,
  title_en       text not null,
  title_ha       text,
  kind           series_kind not null,
  year           text,
  occasion       text,
  language       content_language not null default 'ha',
  cover_from     text not null,          -- gradient [from, to]
  cover_to       text not null,
  cover_arabic   text,
  description_en text,
  description_ha text,
  featured       boolean not null default false,
  position       int not null default 0, -- order within its program
  created_at     timestamptz not null default now()
);
create index series_program_idx on series (program_id, position);

create table lectures (
  id             uuid primary key default gen_random_uuid(),
  title_en       text not null,
  title_ha       text,
  type           media_type not null,
  scope          lecture_scope not null default 'series',
  language       content_language not null default 'ha',
  duration       int,                    -- seconds; null for text
  date           date not null,
  year           text,
  description_en text,
  description_ha text,
  media_url      text,                   -- audio/video source
  body_en        text,                   -- reader body for type = 'text'
  body_ha        text,
  program_id     uuid references programs (id) on delete set null,
  series_id      uuid references series (id) on delete set null,
  episode        int,                    -- part number (series scope only)
  status         publish_status not null default 'draft',
  scheduled_for  timestamptz,            -- when status = 'scheduled'
  featured       boolean not null default false,
  created_at     timestamptz not null default now()
);
create index lectures_series_idx on lectures (series_id, episode);
create index lectures_status_idx on lectures (status);

create table transcripts (
  id         uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references lectures (id) on delete cascade,
  language   content_language not null,
  status     transcript_status not null default 'missing',
  body_en    text,
  body_ha    text,
  unique (lecture_id, language)
);

create table categories (
  id       uuid primary key default gen_random_uuid(),
  label    text not null,        -- English label
  ar       text not null,        -- Arabic motif/label
  meta     text,
  active   boolean not null default true,
  archived boolean not null default false,
  position int not null default 0
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
alter table admin_users enable row level security;
alter table programs    enable row level security;
alter table series      enable row level security;
alter table lectures    enable row level security;
alter table transcripts enable row level security;
alter table categories  enable row level security;
alter table albums      enable row level security;
alter table photos      enable row level security;

-- Content: any admin may READ everything (including drafts); only editors/owners
-- may WRITE. Policies are OR-combined per command, so the `for select` read
-- policy and the `for all` write policy compose to "viewers read, editors write".
create policy read_programs    on programs    for select using (is_admin());
create policy write_programs   on programs    for all    using (is_editor()) with check (is_editor());
create policy read_series      on series      for select using (is_admin());
create policy write_series     on series      for all    using (is_editor()) with check (is_editor());
create policy read_lectures    on lectures    for select using (is_admin());
create policy write_lectures   on lectures    for all    using (is_editor()) with check (is_editor());
create policy read_transcripts on transcripts for select using (is_admin());
create policy write_transcripts on transcripts for all   using (is_editor()) with check (is_editor());
create policy read_categories  on categories  for select using (is_admin());
create policy write_categories on categories  for all    using (is_editor()) with check (is_editor());
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
create policy public_read_published_lectures on lectures for select
  using (status = 'published');

create policy public_read_series on series for select
  using (exists (select 1 from lectures l
                 where l.series_id = series.id and l.status = 'published'));

-- A program is public only if it has a series with at least one published
-- lecture — otherwise a draft-only program's metadata would leak to the app.
create policy public_read_programs on programs for select
  using (exists (select 1 from series s
                 join lectures l on l.series_id = s.id
                 where s.program_id = programs.id
                   and l.status = 'published'));

create policy public_read_transcripts on transcripts for select
  using (exists (select 1 from lectures l
                 where l.id = transcripts.lecture_id and l.status = 'published'));

create policy public_read_active_categories on categories for select
  using (active = true and archived = false);

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
grant select on programs, series, lectures, transcripts, categories, albums, photos
  to anon, authenticated;

-- Admin console (authenticated): full DML on content. RLS enforces editor/owner.
grant insert, update, delete on programs, series, lectures, transcripts, categories, albums, photos
  to authenticated;

-- Admin roster: authenticated only (RLS restricts to owner / self).
grant select, insert, update, delete on admin_users to authenticated;
-- Sample content for the Althaqalayn catalog — run AFTER schema.sql.
-- Mirrors the mobile app's bundled sample data so a connected app looks the same,
-- now backed by the real database. Media URLs point at a public test track so
-- audio actually plays; replace with your CDN URLs. Safe to re-run (idempotent
-- via fixed UUIDs + ON CONFLICT DO NOTHING).

-- ── Program ──────────────────────────────────────────────────────────────────
insert into programs (id, title_en, title_ha, arabic, description_en) values
  ('a0000000-0000-0000-0000-000000000001', 'Ramadan Tafsīr', 'Tafsirin Ramadan', 'تفسير',
   'Daily Qur’anic exegesis across the blessed month.')
on conflict (id) do nothing;

-- ── Series ───────────────────────────────────────────────────────────────────
insert into series (id, program_id, title_en, kind, year, occasion, language,
                    cover_from, cover_to, cover_arabic, description_en, featured, position) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Ramadan Tafsīr 1445', 'occasion', '1445 AH · 2024', 'RAMADAN TAFSIR', 'ha',
   '#0B4634', '#17795E', 'تفسير', 'A daily Qur’anic exegesis, verse by verse, night by night.', true, 0),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Maulud an-Nabī ﷺ 1445', 'occasion', '1445 AH', 'MAULUD', 'ha',
   '#7a5a12', '#c0932f', 'مولد', 'Commemorative lectures on the noble character of the Prophet ﷺ.', true, 1),
  ('b0000000-0000-0000-0000-000000000003', null,
   'Ethics of the Self', 'topic', '2022', 'MORALITY', 'ha',
   '#4a2f5e', '#7a4f9c', 'أخلاق', 'Lessons on purification of the soul and moral excellence.', false, 2),
  ('b0000000-0000-0000-0000-000000000004', null,
   'Commentary on Nahj al-Balāgha', 'book', 'Ongoing', 'BOOK SERIES', 'ha',
   '#173a4f', '#2c7396', 'نهج', 'A sustained commentary on the sermons of Imam Ali (a.s).', false, 3)
on conflict (id) do nothing;

-- ── Lectures (all published) ─────────────────────────────────────────────────
insert into lectures (id, title_en, title_ha, type, scope, language, duration, date, year,
                      description_en, media_url, program_id, series_id, episode, status, featured) values
  ('c0000000-0000-0000-0000-000000000001', 'The Meaning of Divine Mercy', 'Ma’anar Rahamar Allah',
   'audio', 'series', 'ha', 3480, '2024-03-20', '1445 AH · 2024', 'On the breadth of God’s mercy.',
   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
   'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 12, 'published', true),
  ('c0000000-0000-0000-0000-000000000002', 'Patience in Times of Trial', 'Haƙuri a Lokacin Jarrabawa',
   'audio', 'series', 'ha', 2460, '2024-03-17', '2022', 'On sabr and the believing heart.',
   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
   null, 'b0000000-0000-0000-0000-000000000003', 7, 'published', false),
  ('c0000000-0000-0000-0000-000000000003', 'On the Character of the Prophet ﷺ', 'Halayen Annabi ﷺ',
   'video', 'series', 'ha', 4320, '2024-03-15', '1445 AH', 'A Maulud reflection.',
   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
   'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 1, 'published', false),
  ('c0000000-0000-0000-0000-000000000004', 'The Sermon of the Two Weighty Things', 'Huɗubar Nauyaya Biyu',
   'audio', 'series', 'ha', 2820, '2024-03-01', 'Ongoing', 'On the hadith al-thaqalayn.',
   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
   null, 'b0000000-0000-0000-0000-000000000004', 9, 'published', false),
  ('c0000000-0000-0000-0000-000000000005', 'Gratitude and the Believing Heart', 'Godiya da Zuciya Mai Imani',
   'text', 'single', 'ha', null, '2024-02-20', '2022', 'A short reflection on shukr.',
   null, null, 'b0000000-0000-0000-0000-000000000003', 5, 'published', false)
on conflict (id) do nothing;

update lectures set body_en =
  'Gratitude is the response of a heart that recognises its Lord in every breath and every provision.',
  body_ha =
  'Godiya ita ce amsar zuciyar da ta gane Ubangijinta a cikin kowane numfashi da kowace ni''ima.'
where id = 'c0000000-0000-0000-0000-000000000005';

-- ── Explore categories ───────────────────────────────────────────────────────
insert into categories (id, label, ar, meta, active, archived, position) values
  ('d0000000-0000-0000-0000-000000000001', 'Ramadan Tafsir', 'تفسير', '2 series · 60', true, false, 0),
  ('d0000000-0000-0000-0000-000000000002', 'Maulud', 'مولد', 'Yearly', true, false, 1),
  ('d0000000-0000-0000-0000-000000000003', 'Morality', 'أخلاق', '12 lectures', true, false, 2),
  ('d0000000-0000-0000-0000-000000000004', 'Books', 'كتب', 'Nahj & more', true, false, 3)
on conflict (id) do nothing;

-- ── Gallery ──────────────────────────────────────────────────────────────────
insert into albums (id, title, date, event, published) values
  ('e0000000-0000-0000-0000-000000000001', 'Maulud an-Nabī ﷺ 1445', '2024-10-01', 'Maulud an-Nabī', true)
on conflict (id) do nothing;

insert into photos (id, album_id, url, position) values
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/alt1/600/800', 0),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/alt2/600/900', 1),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/alt3/600/700', 2)
on conflict (id) do nothing;
