# Admin Modern Rebuild — Implementation Plan

> Execute subagent-driven. Visual + behavioral source of truth: the approved
> prototype at `docs/superpowers/prototypes/admin-modern.html` (open it; every
> screen, component, and interaction is there). This plan says WHICH files and
> WHAT logic; the prototype says how it must look/behave.

**Goal:** Rebuild `apps/admin` as the approved modern, Collections-first console —
modal+stepper creation, no top-bar create button, content-ops dashboard.

**Architecture:** Keep the Next.js client-SPA + inline-style + CSS-var approach and
the whole data layer (`@althaqalayn/api` is unchanged — all CRUD/reads already exist).
This is a UI/IA rebuild only. New: a global Modal/Stepper system; Collections index +
Collection detail replace the tree ContentWorkspace; editors become modal wizards;
Featured/Transcripts/Media stop being nav destinations (folded into context).

## Global constraints
- No changes to `packages/*`, routing data, or `@althaqalayn/*` signatures.
- Match the prototype exactly for layout, palette (light modern: `--bg #f4f5f3`, white
  cards, subtle borders + soft shadows, green/gold accent), radii, and motion.
- IA = 4 nav items: Dashboard · Collections · Gallery · Settings. Featuring = a ⭐ toggle
  on collection/lecture rows; transcripts = a step in the lecture modal; media library =
  folded into Settings. No top-bar create button — creation opens modals from page
  headers / collection detail / empty states.
- Reuse existing form/field LOGIC (validation, upload, upsert calls) inside the new
  modal steppers — restyle the shell, keep the wiring.
- Every task ends green for the files it owns; whole-app `typecheck` + `build` green at T7.
- Keep the custom confirm modal (`useConfirm`) for deletes.

## Tasks

### T1 — Foundation: modern tokens + shell + Modal/Stepper primitives
- **Tokens:** rewrite `app/globals.css` + `lib/tokens.ts` (+ `lib/ui.ts` brand) to the
  prototype's modern light palette/shadows/radii (supersede the earlier parchment values).
- **Modal system (new):** `components/Modal.tsx` (scrim + centered card, `--sh-3`, esc/
  click-out close, focus trap, `rise`/`pop` motion) and `components/Stepper.tsx` (numbered
  steps w/ active/done states + connectors) + a `useModal`/`ModalHost` so any view can open
  a modal. Match prototype `.modal`/`.stepper`/`.m-foot`.
- **Shell:** `Sidebar.tsx` → light, 4 nav items, soft-tint active (prototype `.side`);
  `Topbar.tsx` → ⌘K search + theme + notification bell + user menu, **remove the primary
  create button**; `Console.tsx` → route Dashboard/Collections/Collection/Gallery/Settings,
  mount `ModalHost`. `Login.tsx` → adopt the modern palette (keep 50/50).
- Gate: `pnpm --filter admin typecheck`. Commit `feat(admin): modern tokens + shell + modal/stepper primitives`.

### T2 — Dashboard (content-ops widgets)
- Rebuild `components/views/Dashboard.tsx` to the prototype: stat cards (delta chips),
  **Needs attention** (drafts / missing media / missing transcript — derive counts from
  `listAllLectures` + a transcript check), **Publishing status** donut, **Upcoming schedule**,
  **Collections by kind**, **Recent activity**. Real data via existing admin reads.
- Gate: typecheck. Commit.

### T3 — Collections index
- New `components/views/Collections.tsx`: kind segments (All/Occasions/Series/Topics) + cover
  cards (gradient + Arabic + kind chip + count + ⭐), header "New collection" → collection modal;
  card click → Collection detail. Data via `listAllCollections` + per-collection counts.
- Gate: typecheck. Commit.

### T4 — Collection detail
- New `components/views/CollectionDetail.tsx`: cover hero + kind/count + Edit + ⭐; lectures
  grouped by `groupLabel` (occasion/topic) or flat by `sort` (series) — reuse `groupLectures`
  logic; per-row type icon, status pill, ⭐ feature toggle (`upsertLecture`), reorder; "Add
  lecture" / "Bulk add" → modals. Delete via `useConfirm`.
- Gate: typecheck. Commit.

### T5 — Lecture modal (4-step wizard)
- `components/content/LectureModal.tsx`: stepper Details → Media → Transcript → Publish.
  Reuse the field logic from the existing `LectureForm.tsx`/`MediaZone`/`PublishControl` and
  `admin.upsertLecture` + transcript upsert. Opens for new (from collection) or edit (row click).
- Gate: typecheck. Commit.

### T6 — Collection modal + Bulk-add modal
- `components/content/CollectionModal.tsx`: 2-step Details → Appearance (kind, bilingual title,
  description, gradient, arabic, featured) via `admin.upsertCollection`.
- `components/content/BulkAddModal.tsx`: wrap the existing `BatchEpisodesForm` logic (multi-file,
  pooled upload/save, sort continuation) in the modal shell.
- Gate: typecheck. Commit.

### T7 — Retire old surfaces + green gate
- Delete/retire `ContentWorkspace.tsx`, `ContentTree.tsx`, `NodeDetail.tsx`, `views/Featured.tsx`,
  `views/Transcripts.tsx`, `views/MediaLibrary.tsx` and their nav entries; move media into Settings;
  ensure featured/transcripts fully live in the new context. Update `lib/views.ts` + `Console.tsx`.
  Remove now-dead components. `grep` clean of removed views.
- **Gate (hard):** `pnpm --filter admin typecheck && pnpm --filter admin build` green. Commit.

### T8 — Gallery + Settings modern pass
- `views/Gallery.tsx` (album cards + album modal via existing `AlbumEditor` logic) and
  `views/Settings.tsx` (roster/roles, theme, + the folded-in media library) to the modern language.
- Gate: typecheck + build. Commit.

### T9 — Whole-branch design-review + green
- Design-review against the prototype + make-interfaces-feel-better checklist; fix findings; final
  `typecheck` + `build` green.

## Sequencing
T1 blocks all. T2/T3 can follow T1; T4 needs T3's nav; T5/T6 need T1's modal system; T7 after
T3–T6 exist; T8 independent after T1; T9 last.
