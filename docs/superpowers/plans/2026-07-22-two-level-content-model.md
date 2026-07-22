# Two-Level Content Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace `Program → Series → Episode` with a two-level model — `Collection{kind} → Lecture{collection_id, group_label, sort}` — across the DB schema, `@althaqalayn/types`, `@althaqalayn/api`, the admin Content Workspace, and the mobile catalog/screens. Drop `programs`/`series`/`categories`. Fresh start (no data migration, no seed data).

**Architecture:** One coherent breaking change on one branch, in dependency order: types → api/schema → admin → mobile. Deleting a collection cascades to its lectures. Collections render by `kind` (occasion/topic grouped by `group_label`, series flat).

**Spec:** `docs/superpowers/specs/2026-07-22-two-level-content-model-design.md` (read it — the model, field list, and decisions are authoritative there).

## Global Constraints

- **This is a deliberate breaking re-model.** The usual additive rule is suspended. But the change must land coherently: by the FINAL task, nothing references the removed `Program`/`Series`/`Category` types or the old admin/mobile code paths.
- **Intermediate breakage is expected.** After the types task, `@althaqalayn/api` won't compile until its task; after api, the apps won't until theirs. **Per-task gate = the CHANGED package/app's own typecheck (+ build/tests where noted).** The whole-repo green gate is the final task. Each task's report must state which downstream packages it knowingly leaves red (to be fixed by a named later task).
- **Fresh start:** no data-migration script; **no seed data** (`collections`/`lectures` start empty). `admin_users`, `albums`, `photos`, `transcripts` are preserved (not dropped). The destructive reset SQL is authored here but **applied by the user** in the Supabase SQL Editor (direct PG is blocked from this machine) — it is NOT run by any task.
- **Kinds:** `occasion | series | topic` only.
- **Preserve** the admin Content Workspace UX (tree + `SectionedForm` + `MediaZone` + bulk multi-file add + delete-everywhere + custom confirm modal + lighter bg) and the mobile premium redesign (theme, offline, bookmarks, player queue, lock-screen) — only the content *shape* changes.
- Client-SPA patterns unchanged (admin + mobile both fetch via their `getClient()`).

## Rendering rule (implement identically in admin tree + mobile collection screen)
Given a collection's lectures ordered by `sort` ascending:
- `kind === "series"` → one flat list (ignore `group_label`).
- `kind === "occasion" | "topic"` → group by `group_label` (null-label items fall in an "Ungrouped" bucket last); groups appear in order of the minimum `sort` of their members; within a group, order by `sort`.

---

## Task 1: `packages/types` — Collection + reshaped Lecture

**Files:**
- Modify: `packages/types/src/common.ts` (enums/ids), `packages/types/src/lecture.ts`, `packages/types/src/index.ts`, `packages/types/src/types.test.ts`
- Create: `packages/types/src/collection.ts`
- Delete: `packages/types/src/program.ts`, `packages/types/src/series.ts`, `packages/types/src/category.ts`

**Interfaces — Produces:**
- `common.ts`: add `export const COLLECTION_KINDS = ["occasion","series","topic"] as const; export type CollectionKind = (typeof COLLECTION_KINDS)[number];` Keep `CollectionId` (add if missing); remove `SeriesKind`, `SERIES_KINDS`, `LectureScope`, `LECTURE_SCOPES`, `ProgramId`, `SeriesId`, `CategoryId` (drop unused). Keep `MediaType`, `Language`, `PublishStatus`, `LocalizedText`, `Gradient`, `ISODate`, `ISODateTime`, `TranscriptId`, `LectureId`, `AlbumId`, `PhotoId`, `UserId`, `TranscriptStatus`, `USER_ROLES`.
- `collection.ts`:
```ts
import type { CollectionId, CollectionKind, Gradient, Language, LocalizedText } from "./common";

export interface CollectionCover {
  gradient: Gradient;
  arabic?: string;
}

/** A browsable grouping of lectures. `kind` drives how the app lays it out:
 *  occasion/topic group their lectures by `Lecture.groupLabel`; series shows a flat ordered list. */
export interface Collection {
  id: CollectionId;
  title: LocalizedText;
  kind: CollectionKind;
  language: Language;
  cover: CollectionCover;
  description?: LocalizedText;
  featured?: boolean;
  /** Order in browse lists. */
  position?: number;
}
```
- `lecture.ts`: rewrite `Lecture`:
```ts
import type {
  CollectionId, ISODate, ISODateTime, Language, LectureId,
  LocalizedText, MediaType, PublishStatus, TranscriptId,
} from "./common";

export interface Lecture {
  id: LectureId;
  collectionId: CollectionId;
  title: LocalizedText;
  type: MediaType;
  language: Language;
  /** Sub-heading within an occasion/topic collection ("1445 AH", "2023 Elections"); omitted for a flat series. */
  groupLabel?: string;
  /** Order within the collection (episode/sitting order). */
  sort: number;
  duration?: number;
  date: ISODate;
  /** Optional display/filter label, e.g. "1445 AH · 2024". */
  year?: string;
  description?: LocalizedText;
  mediaUrl?: string;
  body?: LocalizedText;
  transcriptId?: TranscriptId;
  status: PublishStatus;
  scheduledFor?: ISODateTime;
  featured?: boolean;
}
```
- `index.ts`: export `Collection`/`CollectionCover` + `COLLECTION_KINDS`/`CollectionKind`; remove `Program`/`Series`/`SeriesCover`/`SeriesKind`/`Category` exports.

- [ ] **Step 1:** Add `COLLECTION_KINDS`/`CollectionKind` + `CollectionId` to `common.ts`; remove the now-unused series/program/category enums + id aliases.
- [ ] **Step 2:** Create `collection.ts`; rewrite `lecture.ts`; delete `program.ts`/`series.ts`/`category.ts`.
- [ ] **Step 3:** Update `index.ts` exports.
- [ ] **Step 4:** Update `types.test.ts` — replace any Program/Series/Category assertions with Collection/kind ones (COLLECTION_KINDS length/values; Lecture shape). Keep it a real test of the const enums.
- [ ] **Step 5: Verify** — `pnpm --filter @althaqalayn/types typecheck && pnpm --filter @althaqalayn/types test`. Expect green. (api/admin/mobile now red — fixed in Tasks 3/6/9.)
- [ ] **Step 6: Commit** — `git commit -m "feat(types): two-level content model — Collection + reshaped Lecture; drop Program/Series/Category"`

---

## Task 2: Schema + reset SQL + `database.types`

**Files:**
- Modify: `packages/api/src/schema.sql`, `packages/api/src/grants.sql`, `packages/api/src/setup.sql` (combined), `packages/api/src/database.types.ts`
- Create: `packages/api/src/reset-content-model.sql` (the destructive one-time script the user runs)
- Delete/empty: `packages/api/src/seed.sql` (no seed data — remove its content-table inserts; if the file only seeded content, delete it and drop references)

**Interfaces — Produces:** `database.types.ts` gains `CollectionRow` + rewritten `LectureRow`; drops `ProgramRow`/`SeriesRow`/`CategoryRow`.

- [ ] **Step 1: Read** the current `schema.sql`, `grants.sql`, `setup.sql`, `database.types.ts`, `seed.sql` to match style/policy helpers (`is_admin()`/`is_editor()`/`is_owner()`).
- [ ] **Step 2: Rewrite `schema.sql`** — remove `programs`, `series`, `categories`; add:
```sql
create table collections (
  id           uuid primary key default gen_random_uuid(),
  title_en     text not null,
  title_ha     text,
  kind         text not null check (kind in ('occasion','series','topic')),
  language     text not null default 'ha',
  cover_from   text,
  cover_to     text,
  cover_arabic text,
  description_en text,
  description_ha text,
  featured     boolean not null default false,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

create table lectures (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections (id) on delete cascade,
  title_en      text not null,
  title_ha      text,
  type          text not null check (type in ('audio','video','text')),
  language      text not null default 'ha',
  group_label   text,
  sort          int not null default 0,
  media_url     text,
  body_en       text,
  body_ha       text,
  duration      int,
  date          date not null,
  year          text,
  status        text not null default 'published' check (status in ('draft','published','scheduled')),
  scheduled_for timestamptz,
  featured      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index lectures_collection_idx on lectures (collection_id, sort);
```
Keep `albums`, `photos`, `transcripts` (transcripts still `lecture_id references lectures on delete cascade`), `admin_users` unchanged. Update RLS: enable on `collections`/`lectures`; anon `select` (collections: all; lectures: `status = 'published'`); authenticated CRUD via the existing role helpers. Remove policies for dropped tables. **No seed inserts.**
- [ ] **Step 3: `grants.sql`** — `GRANT SELECT` on `collections`,`lectures` to anon; DML to authenticated; drop grants for removed tables. Update `setup.sql` (the combined file) accordingly.
- [ ] **Step 4: `reset-content-model.sql`** (the user runs this once) — a self-contained, ordered script:
```sql
-- Destructive: drops the OLD content tables + anything depending on them, then
-- creates the new two-level model. Preserves admin_users, albums, photos.
-- transcripts references lectures, so it is dropped + recreated empty.
begin;
drop table if exists transcripts cascade;
drop table if exists lectures cascade;
drop table if exists series cascade;
drop table if exists programs cascade;
drop table if exists categories cascade;
-- (then: create collections, lectures, transcripts as in schema.sql, with RLS + grants)
commit;
```
Fill in the full create/RLS/grant statements (copy from the rewritten schema.sql + grants.sql) so the user can paste ONE script. Recreate `transcripts` (empty) since it FK's lectures. Do NOT touch `admin_users`/`albums`/`photos`. Add a header comment: "Run in Supabase SQL Editor. Destructive to existing lectures/series/programs/categories/transcripts."
- [ ] **Step 5: `database.types.ts`** — add `CollectionRow` (snake_case columns matching the table) + rewrite `LectureRow` (`collection_id`, `group_label`, `sort`, etc.; drop `program_id`/`series_id`/`episode`/`scope`); remove `ProgramRow`/`SeriesRow`/`CategoryRow`. Keep album/photo/transcript/admin rows.
- [ ] **Step 6: seed.sql** — remove content-table inserts; if it becomes empty, delete it and remove any import/reference (check `setup.sql`/scripts).
- [ ] **Step 7: Verify** — `pnpm --filter @althaqalayn/api typecheck` will still fail (mappers/admin/content not yet updated — Task 3). So the gate here is: (a) `database.types.ts` is internally consistent (no TS errors *within* the file — check by reading), (b) the SQL files parse by eye. Report that api typecheck is red pending Task 3 (expected). Do NOT try to make api green yet.
- [ ] **Step 8: Commit** — `git commit -m "feat(api): schema + reset SQL + database.types for collections/lectures; drop programs/series/categories"`

---

## Task 3: `packages/api` — mappers, admin CRUD, content reads

**Files:**
- Modify: `packages/api/src/mappers.ts`, `admin.ts`, `content.ts`, `index.ts`
- Read first: all four (match current style; note current export names so index stays consistent).

**Interfaces — Produces:**
- `mappers.ts`: `mapCollection(row: CollectionRow): Collection`, rewritten `mapLecture(row: LectureRow): Lecture` (maps `collection_id→collectionId`, `group_label→groupLabel`, `sort`, drops old). Remove `mapProgram`/`mapSeries`/`mapCategory`. Keep `mapAlbum`/`mapPhoto`/`mapTranscript`/`mapUser`.
- `admin.ts`:
  - `CollectionInput = Omit<Collection,"id">`, `LectureInput = Omit<Lecture,"id">`.
  - `listAllCollections`, `upsertCollection(client, input, id?)`, `deleteCollection(client, id)` (cascade handled by FK), `setCollectionPositions(client, orderedIds)`.
  - `listAllLectures`, `upsertLecture(client, input, id?)` (writes collection_id/group_label/sort/…), `deleteLecture(client, id)`, `setLectureSort(client, orderedIds)` (writes `sort = index`).
  - Keep album/photo/transcript fns + auth. **Remove** program/series/category fns (`upsertProgram`/`deleteProgram`/`upsertSeries`/`deleteSeries`/`setSeriesPositions`/`upsertCategory`/`deleteCategory`/`listAllCategories`/`setCategoryPositions`).
- `content.ts`: `listCollections()`, `collectionById(id)`, `lecturesForCollection(collectionId)` (published, ordered by sort), home helpers (featured collections; latest published lectures). Remove program/series/category reads.
- `index.ts`: export the new fns + `CollectionRow`/`LectureRow` types; drop removed exports.

- [ ] **Step 1:** Rewrite `mappers.ts` (collection + lecture; drop old).
- [ ] **Step 2:** Rewrite `admin.ts` content sections (collections + lectures CRUD + reorder writers; drop program/series/category). Keep the `Promise.all`-with-`if (r.error) throw` reorder pattern for `setCollectionPositions`/`setLectureSort`.
- [ ] **Step 3:** Rewrite `content.ts` public reads.
- [ ] **Step 4:** Update `index.ts` exports (namespace `admin`, `content`, mappers, row types).
- [ ] **Step 5: Verify** — `pnpm --filter @althaqalayn/api typecheck && pnpm --filter @althaqalayn/api test` green (add/adjust vitest for `mapCollection`/`mapLecture` if the package has mapper tests; if not, at least ensure existing tests pass). `pnpm --filter @althaqalayn/types typecheck` still green. admin/mobile still red (Tasks 6/9).
- [ ] **Step 6: Commit** — `git commit -m "feat(api): collection/lecture mappers + admin CRUD + content reads; drop program/series/category"`

---

## Task 4: Admin data layer + Content Workspace tree

**Files:**
- Modify: `apps/admin/lib/useContentTree.ts`, `apps/admin/components/content/ContentTree.tsx`, `ContentWorkspace.tsx`, `NodeDetail.tsx`
- Read first: all four.

**Model:** `NodeRef = { kind: "collection" | "lecture"; id }`. `NewKind = { kind: "collection" } | { kind: "lecture"; collectionId; groupLabel? }`.

- [ ] **Step 1: `useContentTree.ts`** — fetch collections + lectures; shape into `CollectionNode extends Collection { lectures: Lecture[] }` (lectures ordered by `sort`). Expose `{ tree: { collections: CollectionNode[] }, loading, error, reload }`. Provide a pure `groupLectures(collection: CollectionNode)` helper implementing the rendering rule (returns flat list for series, or `{ label, lectures }[]` groups for occasion/topic) — export it pure for a potential unit test.
- [ ] **Step 2: `ContentTree.tsx`** — rail lists collections; expanding a collection shows its lectures, **grouped by `group_label` with group sub-headings when kind is occasion/topic**, flat when series. `+ New ▾`: New collection / (under a selected collection) New lecture. Per-collection inline "+ Lecture". Reorder: lectures within a collection (▲▼ → `setLectureSort`), collections (▲▼ → `setCollectionPositions`) using the full-list-rewrite pattern.
- [ ] **Step 3: `ContentWorkspace.tsx`** — branch on collection|lecture for read/edit/new; `onDeleteSelected` handles collection (confirm: "Delete collection X? Its N lectures are deleted too." — cascade) + lecture; wire the new editors (Task 5). Keep the custom confirm modal (`useConfirm`).
- [ ] **Step 4: `NodeDetail.tsx`** — read view for a collection (kind, cover, description, lecture count, featured) + a lecture (as today, minus series/episode/scope; show collection name + group label + sort). Keep Edit + Delete buttons.
- [ ] **Step 5: Verify** — `pnpm --filter admin typecheck` (may still be red until Task 5/6 update editors it imports; if Task 4 imports the not-yet-updated editors, expect red — note it, or stub minimally). Prefer to keep admin compiling by updating in an order that resolves imports; if not fully green, state exactly what's pending Task 5.
- [ ] **Step 6: Commit** — `git commit -m "feat(admin): Content Workspace tree on collections/lectures"`

---

## Task 5: Admin editors — Collection + Lecture + bulk add

**Files:**
- Create: `apps/admin/components/content/CollectionForm.tsx`
- Modify: `apps/admin/components/content/LectureForm.tsx`, `BatchEpisodesForm.tsx`
- Delete: `apps/admin/components/content/ProgramForm.tsx`, `SeriesForm.tsx`
- Read first: the current ProgramForm/SeriesForm/LectureForm/BatchEpisodesForm.

- [ ] **Step 1: `CollectionForm.tsx`** — `SectionedForm`: Details (bilingual title, `kind` select [occasion/series/topic], language) / Cover (`GradientPicker` + arabic + featured checkbox). Uses `admin.upsertCollection`/`deleteCollection`. Replaces ProgramForm + SeriesForm. English title required.
- [ ] **Step 2: `LectureForm.tsx`** — rework: a **collection `ParentPicker`** (options = collections; inline "+ New collection" → create + select); a **`group_label`** field (free text; shown/hinted when the chosen collection's kind is occasion/topic; hidden/ignored for series) — offer datalist of existing labels in that collection if easy; a **sort/order** `NumberStepper`; optional **year**; media (`MediaZone` / text body); description; `PublishControl`. Drop scope/series/episode. Save via `admin.upsertLecture` with `{ collectionId, groupLabel?, sort, ... }`.
- [ ] **Step 3: `BatchEpisodesForm.tsx`** → generalize to **bulk lectures into a collection**: takes a `CollectionNode`; a shared **`group_label`** input for the whole batch (optional); the multi-file bulk add (filename→title, sequential `sort` continuing from the collection's max) + pooled upload + pooled save via `upsertLecture` with `collectionId`/`groupLabel`/`sort`. Keep the concurrency caps + gating.
- [ ] **Step 4:** Delete ProgramForm/SeriesForm; fix ContentWorkspace imports to use CollectionForm.
- [ ] **Step 5: Verify** — `pnpm --filter admin typecheck` (still may reference removed api in other views — Task 6). Report pending items.
- [ ] **Step 6: Commit** — `git commit -m "feat(admin): Collection editor + collection-aware Lecture editor + bulk add"`

---

## Task 6: Admin cleanup — remove Categories, fix all remaining references, green build

**Files:**
- Delete: `apps/admin/components/views/Categories.tsx`, `apps/admin/components/CategoryEditor.tsx`
- Modify: `apps/admin/lib/views.ts` (drop `categories` view), `apps/admin/components/Console.tsx`, `Sidebar`/nav, `apps/admin/components/views/Dashboard.tsx`, `Featured.tsx`, `Transcripts.tsx`, `MediaLibrary.tsx`, and ANY file still importing removed api fns/types (grep).

- [ ] **Step 1:** `grep -rn "upsertProgram\|deleteProgram\|upsertSeries\|deleteSeries\|setSeriesPositions\|Category\|categories\|mapSeries\|mapProgram\|\.episode\|seriesId\|programId\|scope" apps/admin` — fix every hit. Remove the Categories nav item/view; update Dashboard counts/nav (programs/series → collections); Featured curates collections+lectures via `featured`; Transcripts still lists lectures (its query/`listAllLectures` now returns the new Lecture shape — adjust field refs); MediaLibrary unaffected except type refs.
- [ ] **Step 2: Verify (GATE)** — `pnpm --filter @althaqalayn/types typecheck && pnpm --filter @althaqalayn/api typecheck && pnpm --filter admin typecheck && pnpm --filter admin build` ALL green. This is the admin-complete gate.
- [ ] **Step 3: Commit** — `git commit -m "refactor(admin): remove categories + all program/series refs; build green on the two-level model"`

---

## Task 7: Mobile catalog on collections/lectures

**Files:**
- Modify: `apps/mobile/lib/catalogProvider.tsx`, `apps/mobile/lib/catalog.ts`, `apps/mobile/lib/player.tsx` (queue rename)
- Read first: all three.

- [ ] **Step 1: `catalog.ts`** — `Playable` keeps its shape; add/adjust so it carries `collectionId`, `groupLabel`, `sort` as needed for the collection screen. Update `SampleSeries`→a `CollectionVM` view-model (id, title, kind, cover, count) or similar; keep helper names the screens use where possible.
- [ ] **Step 2: `catalogProvider.tsx`** — fetch `collections` + `lectures` (published) via `getClient()`; build: `collections` list, `lectureById`, `collectionById`, `lecturesForCollection(id)` (grouped-or-flat per kind — reuse the same rendering rule), home helpers (`featuredCollections`, `latestLectures`). Remove series/program/category state + the `episodesForSeries`/`seriesById` API (replace with collection equivalents). Keep `error`/`refetch`.
- [ ] **Step 3: `player.tsx`** — rename/retarget `playSeries` → `playCollection(lectures, index)` (same queue behavior). Update callers in a later step (Task 8).
- [ ] **Step 4: Verify** — `pnpm --filter mobile typecheck` red until screens (Task 8/9) update; report pending.
- [ ] **Step 5: Commit** — `git commit -m "feat(mobile): catalog + player queue on collections/lectures"`

---

## Task 8: Mobile screens — Home, Library, Collection, Search

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`, `library.tsx`, `search.tsx`
- Rename/rewrite: `apps/mobile/app/series/[id].tsx` → `apps/mobile/app/collection/[id].tsx` (and update `openLecture`/nav routes)
- Read first: each + `apps/mobile/lib/openLecture.ts`.

- [ ] **Step 1: Collection screen** (`collection/[id].tsx`) — header by kind; occasion/topic → sections by `group_label`; series → flat ordered list; per-lecture playing/progress/played states + Continue chip; tap → `playCollection(lectures, i)`; text lectures → reader. (Port the series-screen logic to collections.)
- [ ] **Step 2: Home** — featured-collections rail (`featuredCollections`) + latest lectures; a browse-by-kind entry. Remove the category grid. Continue card uses `progressFor`.
- [ ] **Step 3: Library** — segments by **kind** (Occasions / Series / Topics) + Saved (bookmarks). Each lists collections of that kind → opens the collection screen.
- [ ] **Step 4: Search** — search collections + lectures; results route to collection/lecture; keep debounce + highlight; remove category/topic-grid references.
- [ ] **Step 5: Routing** — update `openLecture.ts` + any `router.push("/series/...")` → `/collection/...`; ensure the player/mini-player still work.
- [ ] **Step 6: Verify** — `pnpm --filter mobile typecheck` (green if Task 9 grep is clean; else report remaining).
- [ ] **Step 7: Commit** — `git commit -m "feat(mobile): Home/Library/Collection/Search on the two-level model"`

---

## Task 9: Mobile cleanup + green gate

**Files:** any remaining references.

- [ ] **Step 1:** `grep -rn "series\|program\|categor\|episode\|scope\|SampleSeries\|episodesForSeries\|playSeries" apps/mobile` (excluding legit uses like `kind==="series"` and file history) — fix every stale reference (types, imports, nav, i18n keys for removed category/series copy if any). Ensure the `(tabs)` category/topic UI is fully removed or repurposed to kind-browse.
- [ ] **Step 2: Verify (GATE)** — `pnpm --filter mobile typecheck && pnpm --filter mobile test` green. (Optionally `npx expo export` as a heavier check.)
- [ ] **Step 3: Commit** — `git commit -m "refactor(mobile): remove series/program/category refs; green on the two-level model"`

---

## Task 10: Whole-repo green gate + reset-SQL handoff

- [ ] **Step 1: Whole-repo gate** — run: `pnpm --filter @althaqalayn/types typecheck && pnpm --filter @althaqalayn/types test && pnpm --filter @althaqalayn/api typecheck && pnpm --filter @althaqalayn/api test && pnpm --filter admin typecheck && pnpm --filter admin build && pnpm --filter mobile typecheck && pnpm --filter mobile test`. ALL green. Fix any straggler.
- [ ] **Step 2: Handoff note** — confirm `packages/api/src/reset-content-model.sql` is complete and self-contained; write a one-paragraph note (in the final report) telling the user to run it in the Supabase SQL Editor before using the new admin, warning it's destructive to existing content (programs/series/categories/lectures/transcripts) and preserves admin_users/albums/photos.
- [ ] **Step 3: Commit** (if any straggler fixes) — `git commit -m "chore: whole-repo green on two-level content model"`

---

## Self-review

- **Spec coverage:** schema+reset (spec §Tables/§Rollout)→Tasks 2; types (§Types)→1; api (§API)→3; admin tree/editors/cleanup incl. remove-categories, kind-grouping, bulk-add, delete-cascade, confirm-modal (§Admin)→4-6; mobile catalog/screens/queue, remove category grid, kind-browse (§Mobile)→7-9; no-seed + user-applied reset (§decisions)→2/10; kinds occasion/series/topic→1/2. All covered.
- **Breaking-change handling:** every task's gate is scoped to the changed package; downstream red is expected and each task names what it leaves pending; the whole-repo green gate is Task 10 (plus admin-green at Task 6, mobile-green at Task 9).
- **Placeholder scan:** foundation tasks (1-3) carry concrete types/SQL/signatures; app tasks (4-9) are read-then-migrate against the now-fixed api and the established Content-Workspace / mobile patterns, with the exact new model fields specified — deliberate, not vague. The reset SQL's create/RLS/grant block is authored by copying the rewritten schema.sql/grants.sql (Task 2) — no invention.
- **Type consistency:** `Collection`/`CollectionKind`/reshaped `Lecture` (Task 1) → row types (Task 2) → mappers/CRUD (Task 3) → consumed by admin (4-6) + mobile (7-9); `NodeRef`/`NewKind` collection|lecture consistent in the admin tree; `groupLectures` rendering rule shared (admin Task 4, mobile Task 7).
- **Destructive SQL is authored but never executed by a task** — applied by the user (Task 10 handoff).
