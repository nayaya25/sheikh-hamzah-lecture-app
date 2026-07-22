# Two-Level Content Model — Design

**Date:** 2026-07-22
**Scope:** `packages/types`, `packages/api` (+ Supabase schema), `apps/admin`, `apps/mobile`
**Status:** Approved design — ready for implementation plan

## Problem

The content model is `Program → per-year Series → Episode`, which is over-structured for the actual content and specifically fights two of the three real shapes:

- **Annual occasions** (Ashura, Maulud, Ghadeer) — the year genuinely groups sittings; a per-year middle level fits.
- **Continuous series** (Milal, Aqaid, Zubda) — one weekly sequence spanning years; chopping it into per-year "Series" is artificial.
- **Impromptu / topical** (society, politics, morality) — a loose topic with a few sittings; the middle level is friction.

Symptoms of the over-modelling: `year` duplicated on both `series` and `lectures`, plus overlapping `kind` / `occasion` / `scope` / `episode` / `program_id` / `series_id`, plus a separate `categories` concept.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Levels | **Two:** Collection → Lecture (the middle "Series/year" becomes a field, not a table) |
| Grouping | A grouping like "Ashura 1445" is **just a label** (`group_label` on the lecture), not its own entity |
| Categories | **Dropped** — browsing is by collection + kind |
| One-off lectures | **Every lecture belongs to a collection**; one-offs go in a seeded default "General talks" collection (no null parents) |
| Existing data | **Fresh start** — drop old content tables, create the new schema clean, re-enter the (small) current content in the new admin. No data-migration script. |
| Kinds | `occasion` \| `series` \| `topic` (drop `recency`/`book`) |

## Model

### Rendering rule (the core idea)
A collection is displayed **by its `kind`**:
- `occasion` / `topic` → group lectures by `group_label` (each distinct label is a heading; its sittings listed under it, ordered by `sort`). Groups ordered by first appearance in `sort` order.
- `series` → one flat list ordered by `sort` (`group_label` ignored / null).

Ashura-by-year and Milal-as-one-sequence come from the **same two tables** — grouping is a view, not stored structure.

### Tables (Supabase / `packages/api/src/schema.sql`)

**`collections`** (replaces `programs` + `series`)
- `id uuid pk default gen_random_uuid()`
- `title_en text not null`, `title_ha text`
- `kind text not null` — check in (`occasion`,`series`,`topic`)
- `cover_from text`, `cover_to text`, `cover_arabic text`
- `description_en text`, `description_ha text`
- `language text not null default 'ha'` — primary language of the collection (en|ha)
- `featured boolean not null default false`
- `position int not null default 0`
- `created_at timestamptz not null default now()`

**`lectures`** (rewritten)
- `id uuid pk default gen_random_uuid()`
- `collection_id uuid not null references collections(id) on delete cascade`
- `title_en text not null`, `title_ha text`
- `type text not null` — check (`audio`,`video`,`text`)
- `language text not null default 'ha'`
- `group_label text` — nullable sub-heading (occasion year / topic sub-group); null for flat series
- `sort int not null default 0` — order within the collection
- `media_url text`, `body_en text`, `body_ha text`
- `duration int`
- `date date not null`
- `year text` — optional display/filter label (e.g. "1445 AH · 2024"); may equal `group_label` for occasions
- `status text not null default 'published'` — check (`draft`,`published`,`scheduled`)
- `scheduled_for timestamptz`
- `featured boolean not null default false`
- `created_at timestamptz not null default now()`
- index on `(collection_id, sort)`

> Note on `on delete cascade`: deleting a collection deletes its lectures. (Old app used SET NULL to "keep but unlink" — with no null parents that's no longer meaningful; cascade is correct here. The admin delete-confirm copy must say the lectures are deleted too.)

**Unchanged:** `albums`, `photos`, `transcripts` (still FK to `lectures`), `admin_users`.
**Dropped:** `programs`, `series`, `categories`.

**Seed:** one default collection — `{ title_en: "General talks", kind: "topic" }` — as the home for one-off lectures. Plus the existing admin user seed.

**RLS + grants:** mirror the current policies for the two new tables — anon reads `published` lectures + all collections; authenticated admins full CRUD via `is_admin()`/`is_editor()`/`is_owner()`. `GRANT SELECT` to anon, DML to authenticated. Drop the removed tables' policies.

### Types (`packages/types`)
- Add `Collection { id; title: LocalizedText; kind: CollectionKind; cover: SeriesCover; description?; language: Language; featured?; position? }` and `const COLLECTION_KINDS = ["occasion","series","topic"]`.
- `Lecture` gains `collectionId`, `groupLabel?`, `sort`; **drops** `scope`, `programId`, `seriesId`, `episode`. Keeps `title/type/language/duration/date/year?/description?/mediaUrl/body?/status/scheduledFor?/featured?`.
- **Remove** `Program`, `Series` (and `SeriesKind`), `Category` and their id aliases as appropriate (keep `CollectionId`).
- `mobile`/`admin` type consumers updated accordingly.

### API (`packages/api`)
- `admin.ts`: `upsertCollection`/`deleteCollection`/`setCollectionPositions`; `upsertLecture`/`deleteLecture`/`setLectureSort(collectionId, orderedIds)`; keep album/photo/transcript fns. Remove program/series/category fns.
- `content.ts`: public reads — `listCollections()`, `collectionWithLectures(id)`, home helpers (featured collections, latest lectures). Remove program/series/category reads.
- `mappers.ts` / `database.types.ts`: map the two new tables; drop old.

## Admin (`apps/admin`)
- **Content Workspace tree** → **Collection ▸ Lecture**. Under a collection: if `kind` is occasion/topic, lectures are grouped by `group_label` (headings); if `series`, a flat ordered list. `+ New ▾`: New collection / New lecture (in the selected collection). Reorder lectures within a collection (writes `sort`); reorder collections (writes `position`).
- **Collection editor** (`SectionedForm`): Details (bilingual title, kind, language, description) / Cover (gradient + arabic + featured) . Replaces Program + Series editors.
- **Lecture editor**: collection picker (with inline "+ New collection"), `group_label` (shown/hinted for occasion/topic; free text or suggest existing labels in the collection), `sort`/order (number), `year` (optional), media (MediaZone / text body), description, publish control.
- **Bulk multi-file add** (the Milal workflow) — carries over, now scoped to a collection: multi-select files → rows (title from filename, sequential `sort`, shared `group_label` field for the batch), pooled upload + pooled save.
- **Delete everywhere** (collections, lectures, transcripts, albums, photos) — carries over; the confirm/alert **custom modal** carries over. Collection-delete confirm must state lectures are deleted (cascade).
- **Remove** the Categories view + nav item. **Featured & Home** curates by toggling `featured` on collections/lectures.
- Content-pane lighter background — already shipped; keep.

## Mobile (`apps/mobile`)
- **Catalog** (`catalogProvider`/`catalog.ts`): model becomes collections + lectures; `Playable` keeps its shape but sources from lectures with `collectionId`/`groupLabel`/`sort`; `lectureById`, `collectionById`, `lecturesForCollection(id)` (grouped or flat by kind), home helpers (featured collections, latest lectures).
- **Home**: featured collections rail + latest lectures + browse-by-kind entry (Occasions / Series / Topics). Category grid removed.
- **Library**: browse **by kind** — segments Occasions / Series / Topics (+ Saved bookmarks). Each opens the collection.
- **Collection screen** (replaces series screen): header by kind; occasion/topic → sections by `group_label`; series → flat ordered list; per-lecture states (playing/progress/played) + Continue chip; tapping a lecture plays it and sets the collection's lectures as the queue.
- **Player queue**: `playCollection(lectures, index)` (the current `playSeries` renamed/retargeted).
- Bookmarks, downloads, gallery, reader, settings — unaffected by the model change except type renames.

## Rollout (dependency order; each layer builds green)
1. **types** — new `Collection`/`CollectionKind`, updated `Lecture`, drop old; update the types test.
2. **api + schema** — rewrite schema.sql/seed/grants/RLS for the two tables; admin/content/mappers/database.types; api typecheck + vitest.
3. **Apply the new schema in Supabase** (user runs the reset SQL via the SQL Editor — direct PG is blocked from this machine). This drops old content tables + creates the new ones + seeds. (Done once, by the user, when ready.)
4. **admin** — Content Workspace + editors on the two-level model; remove Categories; keep bulk-add/delete/confirm-modal; typecheck + build.
5. **mobile** — catalog + Home/Library/collection screen/player queue; remove category grid; typecheck + build + jest.
6. QA pass; then the user re-enters content in the new admin and rebuilds the APK.

## Constraints & non-goals
- Fresh start: **no data-migration script**; the reset SQL is destructive to the old content tables (albums/photos/transcripts/admin_users preserved). The user applies it via the Supabase SQL Editor.
- Additive-only rule relaxed for `packages/api`/`types` here (this is a deliberate breaking re-model), but the change must land coherently across all layers so nothing is left referencing removed types.
- No auth/roles change. Gallery/reader/bookmarks/downloads unchanged in behavior.
- Keep the green/gold identity, the admin Content Workspace UX, and the mobile premium redesign — only the content *shape* changes.
- Out of scope: multi-category tagging, per-year collection metadata (the grouping is a label, decided), Arabic UI.

## Testing
- Per-task: `pnpm --filter <pkg> typecheck` (+ `build` for apps); vitest for `packages/types` + `packages/api` mappers/reducers; jest for mobile pure logic (already seeded).
- Manual QA: create a collection of each kind; add lectures with/without group labels; verify admin tree grouping + mobile rendering (occasion grouped by year, series flat); bulk-add; delete (cascade); featured; player queue from a collection; offline/bookmarks still work.
