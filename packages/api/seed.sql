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
