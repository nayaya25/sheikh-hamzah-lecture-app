# Admin UX Redesign — Content Workspace

**Date:** 2026-07-20
**App:** `apps/admin` (Next.js 16, client-SPA, inline-style components)
**Status:** Approved design — ready for implementation plan

## Problem

The admin console works but is awkward to operate:

- All editing happens in a **narrow 472px right-hand drawer** — cramped for multi-field, multi-section content.
- **Lectures** and **Programs & series** are separate top-level views with no connection; the hierarchy (Program → Series → Episode) is never navigable as one object, so managing series "feels hardcoded."
- **Wrong input widgets** in places (free-text where a picker/stepper/date belongs; a publish *toggle* instead of a proper draft/publish/schedule control).
- **Media handling** is thin: no drag-and-drop, no upload progress, no client-side size/type guard before upload, hand-typed duration, duplicated upload code paths (single vs batch).
- Editor styles (`inp`/`sel`/`Drawer`/scrim) are **copy-pasted across components**.

Direct user request: *"the UI/UX experience to properly manage the data and media for the app needs a proper rethink and organization … narrow side modal … input fields where others are more appropriate … a more holistic improvement to the User flows and how everything connects."*

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Editor layout | Wider **sectioned** editing surface (not the narrow drawer) |
| Hierarchy navigation | **Tree sidebar + detail panel** |
| Field/media improvements | **All:** proper publish control, right widget per field, stronger media zone, inline parent create |
| Scope / rollout | **Everything at once** (all admin views on the new pattern) |
| Overall approach | **A — Content Workspace + shared sectioned form engine** |
| Testing | Manual QA checklist now; unit-test runner deferred |

## Approach A — Content Workspace

Reconciles the two layout answers: **tree + detail** is the *browse* surface; a **wide sectioned form** is the *edit* surface. The tree's detail panel hosts the sectioned form inline; the *same* form engine is mounted in a ~800px drawer for entities that don't live in the tree. One form engine, two mounts.

## Architecture

### 1. Information architecture & navigation

Sidebar consolidates from 9 flat items; `Lectures` + `Programs & series` merge into one **Content** hub.

```
MANAGE                         SYSTEM
  Dashboard                      Settings
  Content        ← NEW (merges Lectures + Programs & series)
  Categories
  Gallery & events
  Transcripts
  Featured & Home
  Media library
```

`View` type and `NAV` in `lib/views.ts` change: remove `lectures` and `series`, add `content`. `VIEW_TITLES` updated. `Console.tsx` routes `content` → `<ContentWorkspace/>`; the standalone `<Lectures/>` and `<SeriesManager/>` renders are removed.

### 2. Content Workspace shell

Three columns inside the Content view: app sidebar | **content tree rail** | **detail panel**.

```
┌ Sidebar ─┬ Content tree ──────┬ Detail panel ─────────────────┐
│ Dashboard│ [Search…]          │  (selected node's read-view   │
│▸Content  │ ▾ Ramadan Tafsir   │   or sectioned editor renders  │
│ Category │   ▾ Tafsir 1445    │   here; empty → overview)      │
│ Gallery  │      12 Night 12   │                               │
│ …        │   ▸ Tafsir 1444    │                               │
│          │ ▸ Maulud Lectures  │                               │
│          │ ── Standalone ──   │                               │
│          │   • Eid Khutbah    │                               │
│          │ [+ New ▾]          │                               │
└──────────┴────────────────────┴───────────────────────────────┘
```

**Tree nodes:** Program (expand → Series) ▸ Series (expand → Episodes) ▸ Episode. A **Standalone** group lists lectures with no `series_id`.

**`+ New ▾`** is context-aware: New program / New series (under selected program) / New episode (under selected series) / New standalone lecture. Live search filters the tree. Empty selection → workspace overview (counts + recent + quick actions).

### 3. Detail panel: read/edit + shared form engine

The panel has two modes per node: **Read view** (default) and **Edit** (an Edit button flips them; new nodes open in Edit).

**`SectionedForm`** — one component powering every editor, inline in the panel and in the drawer. It renders an ordered list of titled **section cards**, owns submit / dirty / validation-gating / form-level error, and delegates each control to the field kit. Per-entity editors become thin declarations of *which sections, which fields*.

**Field kit** (replaces raw `inp`/`sel`; each is a self-contained unit with label + control + validation message + disabled/busy state):

- `TextField`, `TextArea` (auto-grow)
- `BilingualField` (EN/HA paired)
- `SelectField` (year / language / kind / media type)
- `NumberStepper` (episode #)
- `DatePicker`, `DateTimePicker`
- `PublishControl` — segmented **Draft / Publish now / Schedule**; datetime reveals only under Schedule (replaces the boolean toggle + separate schedule field)
- `ParentPicker` — dropdown + inline **`+ New …`** mini-create without leaving the form
- `MediaZone` (see §4)
- `GradientPicker`, `Toggle`

**Per-entity sections:**

| Entity | Sections |
|---|---|
| Program | Details / Cover / Series-in-program (reorderable) |
| Series | Details / Cover / Episodes (reorderable, inline add) / Publish |
| Episode (lecture) | Details / Media / Description / Publish |
| Standalone lecture | Details / Media / Description / Publish |
| Category | Details / Ordering |
| Gallery album | Details / Cover / Photos (grid, multi-upload, reorder, captions) |
| Transcript | Details / Linked lecture (`ParentPicker`) / Body / Publish |
| Featured & Home | Curation lists (pick + reorder; no free-text) |

Non-tree entities (Category, Gallery album, Transcript, Featured, standalone quick-create) mount `SectionedForm` inside the ~800px sectioned **drawer** (one `Drawer` shell, widened from 472px).

### 4. MediaZone

Replaces `MediaUploadField`; type-aware; used for episode, standalone lecture, gallery photo, program/series cover.

- **Drag-and-drop or browse**; dropzone highlights on drag-over.
- **Determinate upload progress**; form save is disabled while any upload is in flight.
- **Type-aware preview** via existing `MediaPreview` (audio player / `<video>` / `<img>` / text body).
- **Client-side guards before upload:** size ≤ 50 MB and MIME matches selected media type → inline error, no wasted upload; clear cap messaging.
- **Replace** re-uploads and deletes the old object; **Remove** clears and deletes. `storagePathFromUrl` + `deleteMedia` logic moves inside the component.
- **Auto-fill duration** for audio/video from the loaded `HTMLMediaElement.duration` (manual override allowed) — removes the hand-typed length box for most cases.
- Internal state (file, uploading, progress, error, url); exposes settled `value` + `onChange`. Single upload code path shared by single and batch flows.

### 5. Batch episodes & reordering

- **Batch creation kept, relocated:** on a Series node, the Episodes section offers `+ Add episode` (single) and `+ Add multiple` → inline repeater of compact episode rows (title EN/HA, #, compact `MediaZone`), sharing the series' year/language/program. Same `admin.upsertLecture` fan-out as today, but parent context is implicit.
- **Reordering:** series-within-program and episodes-within-series get drag-to-reorder, persisted to existing `position` / `episode` columns.

## Data flow

```
useContentTree()
  → parallel fetch: programs, series, lectures (all rows via getClient)
  → shape: Program[] { series: Series[] { episodes: Lecture[] } } + standalone: Lecture[]
  → exposes: tree, loading, error, reload(), mutate helpers
```

- Workspace state: `selectedNodeId` + `mode` (`read` | `edit` | `new`). Node selection resolves against the in-memory tree — no per-click refetch.
- Saves use existing `admin.upsert*` / `delete*`; on success → `reload()` (or optimistic local patch). Single source of truth eliminates the current Lectures-list / Series-grid drift.
- Counts (episodes per series, series per program) derived from the tree, not recomputed in three components.

## Validation & error handling

- **Validation** is field-level in the field kit: required (English title; a chosen parent for series-scoped episodes — new), numeric episode #, size/MIME in `MediaZone`. `SectionedForm` blocks submit while any field is invalid or any upload is in flight, and scrolls to the first error.
- **Errors, three tiers:** (1) inline field errors; (2) form-level banner on save failure that **preserves entered data**; (3) tree/panel load error with retry (matches current "Couldn't load" style).
- **Delete** keeps the `confirm()` guard and the existing "children are unlinked, not deleted" messaging.

## Reused / new / removed

- **Reused:** `ActionMenu`, `MediaPreview`, `admin.*` API, `getClient`, `coverGradient`, `statusPill`/`mediaBadge`, `YEARS`, theme CSS vars.
- **New:** `ContentWorkspace`, `ContentTree`, `NodeDetail`, `SectionedForm`, field-kit components, `MediaZone`, `useContentTree`.
- **Removed/folded:** `LectureEditor` dual-mode body, `EpisodesDrawer` (folds into tree), `views/Lectures.tsx` + `views/SeriesManager.tsx` (become the workspace), per-file duplicated `inp`/`sel`/`Drawer`/scrim styles.

## Testing

Proportional to a client-SPA with no current test setup:

- **Primary — manual QA checklist:** create/edit/delete at each tree level; batch add; reorder persists; upload + replace + oversize rejection; schedule vs publish vs draft; inline parent create; empty states; dark mode; search filter.
- **If a runner is later added:** field kit + `SectionedForm` (dirty/validation/submit-gating) and `useContentTree`'s row→tree shaping are pure and the natural unit seams. No live-Supabase tests.
- **CI gate stays:** type-check + `next build`.

## Constraints & non-goals

- Preserve the client-SPA pattern (no async server APIs); read `node_modules/next/dist/docs/` before Next-specific code per `apps/admin/AGENTS.md`.
- No schema changes required (uses existing `position` / `episode` / `series_id` / `program_id`).
- No changes to the mobile app or shared packages beyond what `admin` imports today.
- Out of scope: auth/roles changes, new content types, analytics.

## Rollout

Everything-at-once, but built in a safe internal order so the app compiles throughout:
1. Field kit + `MediaZone` + `SectionedForm` (no wiring).
2. `useContentTree` + `ContentWorkspace` shell + tree + read view.
3. Inline sectioned editors for Program / Series / Episode / Standalone; batch + reorder.
4. Sidebar/nav swap (`content` replaces `lectures`+`series`).
5. Migrate Category / Gallery / Transcript / Featured editors onto `SectionedForm` in the widened drawer.
6. Remove dead components; QA checklist pass; `next build`.
