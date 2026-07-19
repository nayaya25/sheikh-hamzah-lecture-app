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
