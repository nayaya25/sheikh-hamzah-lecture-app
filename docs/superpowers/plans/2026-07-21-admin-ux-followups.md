# Admin UX Redesign — Follow-ups Implementation Plan

> **For agentic workers:** Implement task-by-task; each ends with typecheck + `next build` + commit. Checkbox (`- [ ]`) steps.

**Goal:** Close the five non-blocking spec gaps the final review flagged after the Content Workspace shipped: series-in-program reorder, Category ordering, Gallery photo reorder + captions, tree load-error retry, and focus-first-error on save-block.

**Architecture:** Additive only. Three new `@althaqalayn/api` reorder/update writers; small UI additions reusing the existing reorder pattern (full-ordered-id-list → `set*Positions`, up/down buttons with boundary-disable) already proven in `Featured.moveFeaturedSeries` and `SeriesForm` episode reorder.

**Tech Stack:** Next.js 16 client-SPA, React 19, TypeScript, Supabase JS, inline-style components.

## Global Constraints

- **No DB schema changes.** Columns already exist: `categories.position`, `photos.position`, `photos.caption`, `series.position`. (Verified.)
- **Additive to `@althaqalayn/api` only**; no `@althaqalayn/types` domain-shape changes; no mobile changes.
- Client-SPA: all data via `getClient()`; every data component `"use client"`.
- Reorder pattern: build the **full** ordered id array (not a subset), swap two indices, persist the whole array — preserves untouched rows' positions (the pattern verified safe in `Featured.tsx`).
- CSS vars + `@/lib/ui` (brand/font); brand buttons with `#fff` text and `#a23e3e` error are established conventions.
- Per-task gate: `pnpm --filter admin typecheck && pnpm --filter admin build` both pass, then commit. No test runner (per prior spec decision).

---

## Task 1: API — category/photo reorder + photo caption update

**Files:**
- Modify: `packages/api/src/admin.ts` (append to the relevant sections)

**Interfaces — Produces:**
- `setCategoryPositions(client, orderedIds: string[]): Promise<void>` — writes `position = index` per id.
- `setPhotoPositions(client, orderedIds: string[]): Promise<void>` — writes `position = index` per id.
- `updatePhoto(client, id: string, patch: { caption?: string | null }): Promise<void>` — updates a photo's caption.

- [ ] **Step 1: Add the three functions**

Append to the Categories section of `packages/api/src/admin.ts`:

```ts
/** Persist a new category display order (writes the `position` column). */
export async function setCategoryPositions(
  client: AlthaqalaynClient,
  orderedIds: string[],
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      client.from("categories").update({ position: index }).eq("id", id).then((r) => {
        if (r.error) throw new Error(r.error.message);
      }),
    ),
  );
}
```

Append to the Gallery section (near `addPhoto`/`deletePhoto`):

```ts
/** Persist a new photo order within an album (writes the `position` column). */
export async function setPhotoPositions(
  client: AlthaqalaynClient,
  orderedIds: string[],
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      client.from("photos").update({ position: index }).eq("id", id).then((r) => {
        if (r.error) throw new Error(r.error.message);
      }),
    ),
  );
}

/** Update an existing photo's caption (null clears it). */
export async function updatePhoto(
  client: AlthaqalaynClient,
  id: string,
  patch: { caption?: string | null },
): Promise<void> {
  const { error } = await client.from("photos").update({ caption: patch.caption ?? null }).eq("id", id);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: Confirm barrel export** — `packages/api/src/index.ts` exports admin as a namespace (`export * as admin`), so the new names are available as `admin.setCategoryPositions` etc. Verify with `grep -n "admin" packages/api/src/index.ts`; only edit if functions are re-exported individually.

- [ ] **Step 3: Typecheck** — `pnpm --filter @althaqalayn/api typecheck` (or `pnpm --filter @althaqalayn/api exec tsc --noEmit`). Expect no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/admin.ts packages/api/src/index.ts
git commit -m "feat(api): setCategoryPositions + setPhotoPositions + updatePhoto"
```

---

## Task 2: Content tree load-error retry

**Files:**
- Modify: `apps/admin/components/content/ContentWorkspace.tsx`

**Interfaces:** none new. Consumes existing `reload` from `useContentTree`.

- [ ] **Step 1: Add a retry button to the error state**

Find the error render (currently `if (error || !tree) return <div style={pad}>Couldn’t load content: {error}</div>;`). Replace with a version that offers retry:

```tsx
  if (error || !tree) {
    return (
      <div style={pad}>
        <div style={{ marginBottom: 12 }}>Couldn’t load content{error ? `: ${error}` : ""}.</div>
        <button
          onClick={() => void reload()}
          style={{ background: brand.green, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font.ui }}
        >
          Retry
        </button>
      </div>
    );
  }
```

Ensure `brand` and `font` are imported from `@/lib/ui` (add to the existing import if missing).

- [ ] **Step 2: Typecheck + build** — `pnpm --filter admin typecheck && pnpm --filter admin build`. Expect success.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/components/content/ContentWorkspace.tsx
git commit -m "feat(admin): retry button on content tree load error"
```

---

## Task 3: Series-in-program reorder (Program editor)

**Files:**
- Modify: `apps/admin/components/content/ProgramForm.tsx`
- Modify: `apps/admin/components/content/ContentWorkspace.tsx` (pass the program's series + reorder callback)

**Context:** `ProgramForm` currently has only a Details section. `admin.setSeriesPositions` already exists (used by Featured). Add a "Series in this program" section, shown ONLY when editing an existing program (`program` non-null), listing the program's `seriesNodes` with up/down reorder. Reorder writes the FULL series-id array across all series (fetch the full position-ordered series list, swap the two moved entries, persist whole array) — same full-list-rewrite pattern as `Featured.moveFeaturedSeries`, so non-program series keep their positions.

**Interfaces:** `ProgramForm` gains optional props:
- `seriesInProgram?: SeriesNode[]` — the program's series (from the tree node), in display order.
- `allSeriesOrder?: { id: string }[]` — the full position-ordered series list (from the tree: programs' seriesNodes flattened in position order + orphanSeries) used to build the full id array for `setSeriesPositions`.
- `onReorderSeries?: (orderedFullIds: string[]) => Promise<void>` — persists + reloads.
- `onEditSeries?: (id: string) => void` — optional: clicking a series row opens it.

To keep it simple and robust, have `ContentWorkspace` own the full-list computation and expose one callback the form calls with just the two series ids being swapped, OR compute in the form. **Chosen approach:** `ContentWorkspace` passes `seriesInProgram` (the node's ordered series) and a single `onReorderProgramSeries(programId, movedId, direction)` callback that does the full-list math + `admin.setSeriesPositions` + `reload`. This keeps position math in one place next to the tree data.

- [ ] **Step 1: Add the reorder callback in ContentWorkspace**

Add a helper that builds the global position-ordered series id list and swaps a program-series with its in-program neighbour, mirroring `Featured.moveFeaturedSeries`:

```tsx
  const reorderProgramSeries = async (programId: string, movedId: string, dir: -1 | 1) => {
    const prog = tree.programs.find((p) => p.id === programId);
    if (!prog) return;
    const inProg = prog.seriesNodes; // display (position) order within program
    const idx = inProg.findIndex((s) => s.id === movedId);
    const neighbour = inProg[idx + dir];
    if (!neighbour) return;
    // Full global position order: all programs' series (in program order) then orphanSeries.
    const fullIds = [
      ...tree.programs.flatMap((p) => p.seriesNodes.map((s) => s.id)),
      ...tree.orphanSeries.map((s) => s.id),
    ];
    const a = fullIds.indexOf(movedId);
    const b = fullIds.indexOf(neighbour.id);
    if (a < 0 || b < 0) return;
    [fullIds[a], fullIds[b]] = [fullIds[b], fullIds[a]];
    await admin.setSeriesPositions(getClient(), fullIds);
    await reload();
  };
```

- [ ] **Step 2: Pass series + callback to ProgramForm (edit mode)**

Where `ProgramForm` is rendered for `mode === "edit" && selected?.kind === "program"`, pass:

```tsx
          seriesInProgram={findProgram(selected.id)?.seriesNodes ?? []}
          onReorderProgramSeries={(movedId, dir) => reorderProgramSeries(selected.id, movedId, dir)}
          onEditSeries={(id) => { setSelected({ kind: "series", id }); setMode("edit"); }}
```

(New program has no series yet, so the new-mode ProgramForm needs none of these.)

- [ ] **Step 3: Add the Series section to ProgramForm**

Add optional props to `ProgramForm`:

```tsx
  seriesInProgram,
  onReorderProgramSeries,
  onEditSeries,
}: {
  program: ProgramNode | null;
  onCancel: () => void;
  onSaved: () => void;
  seriesInProgram?: SeriesNode[];
  onReorderProgramSeries?: (movedId: string, dir: -1 | 1) => void | Promise<void>;
  onEditSeries?: (id: string) => void;
}) {
```

Import `SeriesNode` from `@/lib/useContentTree` and `brand` from `@/lib/ui` and `CSSProperties`/`ActionMenu` as needed. Append a section to the `sections` array, only when editing an existing program with series:

```tsx
    ...(program && (seriesInProgram?.length ?? 0) > 0
      ? [{
          key: "series",
          title: `Series in this program (${seriesInProgram!.length})`,
          render: () => (
            <div>
              {seriesInProgram!.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button type="button" onClick={() => void onReorderProgramSeries?.(s.id, -1)} disabled={i === 0} style={reorderBtn}>▲</button>
                    <button type="button" onClick={() => void onReorderProgramSeries?.(s.id, 1)} disabled={i === seriesInProgram!.length - 1} style={reorderBtn}>▼</button>
                  </div>
                  <button type="button" onClick={() => onEditSeries?.(s.id)} style={{ flex: 1, textAlign: "left", background: "transparent", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                    {s.title.en}
                  </button>
                  <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.year ?? ""}</span>
                </div>
              ))}
            </div>
          ),
        }]
      : []),
```

Add the `reorderBtn` style at module scope (copy from `SeriesForm.tsx`):

```tsx
const reorderBtn: CSSProperties = { background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 9, lineHeight: 1, padding: 0 };
```

Add `import type { CSSProperties } from "react";` if not present.

- [ ] **Step 4: Typecheck + build** — `pnpm --filter admin typecheck && pnpm --filter admin build`. Expect success.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/components/content/ProgramForm.tsx apps/admin/components/content/ContentWorkspace.tsx
git commit -m "feat(admin): reorder series within a program"
```

---

## Task 4: Category ordering (list reorder)

**Files:**
- Modify: `apps/admin/components/views/Categories.tsx`

**Context:** Read `Categories.tsx` first. It lists categories (ordered by `position` via `admin.listAllCategories`). Add up/down reorder controls to each category row, persisting via `admin.setCategoryPositions` with the full ordered id list (swap two indices, persist whole array), then refetch the list. Match the existing list-row styling; do not change the editor or the API payloads.

- [ ] **Step 1: Read the current file**

Run: `cat apps/admin/components/views/Categories.tsx` — note the state holding the category list, the refetch function, and the row render.

- [ ] **Step 2: Add reorder**

Add a `move(index, dir)` handler:

```tsx
  const move = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= categories.length) return;
    const next = [...categories];
    [next[index], next[j]] = [next[j], next[index]];
    setCategories(next); // optimistic; use the actual state setter name from the file
    await admin.setCategoryPositions(getClient(), next.map((c) => c.id));
    // then refetch using the file's existing loader, if it has one, to stay in sync
  };
```

Adapt `categories`/`setCategories` to the actual state variable names in the file. In each row, add ▲/▼ buttons (disabled at boundaries) calling `void move(i, -1)` / `void move(i, 1)`, styled like other reorder controls (`reorderBtn` pattern: transparent, `var(--muted)`, small). Ensure `admin` and `getClient` are imported (they likely already are).

- [ ] **Step 3: Typecheck + build** — `pnpm --filter admin typecheck && pnpm --filter admin build`. Expect success.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/components/views/Categories.tsx
git commit -m "feat(admin): reorder categories"
```

---

## Task 5: Gallery photo reorder + captions

**Files:**
- Modify: `apps/admin/components/AlbumEditor.tsx`

**Context:** Read `AlbumEditor.tsx` first. Photos are listed (ordered by `position`) with a delete control. Add: (a) up/down reorder per photo persisting via `admin.setPhotoPositions(getClient(), orderedIds)` then refresh the photo list; (b) an editable caption per photo — a `TextField` (or inline input) whose blur/save calls `admin.updatePhoto(getClient(), photo.id, { caption })`. After adding new photos, normalize order by calling `setPhotoPositions` with the current ordered ids so freshly-added photos (DB default position 0) don't jump to the front.

- [ ] **Step 1: Read the current file** — note the photo-list state, the loader (e.g. `loadPhotos(albumId)`), and the row render.

- [ ] **Step 2: Photo reorder**

Add a `movePhoto(index, dir)` mirroring the category/series pattern: swap two entries in the local photo array, `await admin.setPhotoPositions(getClient(), next.map((p) => p.id))`, then reload photos via the file's existing loader. Add ▲/▼ buttons (disabled at boundaries) to each photo cell.

- [ ] **Step 3: Caption editing**

Add a caption input under/next to each photo. Track a local editable value; on blur (or an explicit small "Save" affordance), call `await admin.updatePhoto(getClient(), p.id, { caption: value.trim() || null })` then reload photos. Use `TextField` from `@/components/fields` or a plain input consistent with the grid; keep it compact.

- [ ] **Step 4: Normalize order after adding photos**

In the existing multi-upload add flow, after all `admin.addPhoto` calls and the reload, call `admin.setPhotoPositions(getClient(), <current ordered ids>)` once so positions are 0..N and stable. (New photos default to position 0; this normalizes.)

- [ ] **Step 5: Typecheck + build** — `pnpm --filter admin typecheck && pnpm --filter admin build`. Expect success.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/components/AlbumEditor.tsx
git commit -m "feat(admin): gallery photo reorder + caption editing"
```

---

## Task 6: Focus-first-error on save-block (content editors)

**Files:**
- Modify: `apps/admin/components/content/ProgramForm.tsx`, `SeriesForm.tsx`, `LectureForm.tsx`

**Context:** Today, when save is blocked because the English title is empty, the forms set a field error but the view doesn't move — on a long form the error can be off-screen. Add a lightweight focus-and-scroll: when the title guard fires, scroll the title field into view and focus it. Keep it minimal and shared where practical.

**Approach:** Each of the three forms uses `BilingualField` for the title. Attach a `ref` to a wrapping element around the title `BilingualField` (or use `document`-free React ref on a div), and in the save guard, before returning, call `titleRef.current?.scrollIntoView({ block: "center" })` — plain, no focus management needed if scroll suffices. (Avoid `behavior: "smooth"` to keep it deterministic.)

- [ ] **Step 1: Add a title ref + scroll in each form**

In each of `ProgramForm.tsx`, `SeriesForm.tsx`, `LectureForm.tsx`:

```tsx
import { useRef } from "react"; // add to existing react import
// inside component:
const titleRef = useRef<HTMLDivElement>(null);
```

Wrap the title `BilingualField` in a `<div ref={titleRef}>…</div>` (in each form's Details section render). In each `save()` guard where the title is empty:

```tsx
    if (!titleEn.trim()) {
      setTitleError("English title is required.");
      titleRef.current?.scrollIntoView({ block: "center" });
      return;
    }
```

- [ ] **Step 2: Typecheck + build** — `pnpm --filter admin typecheck && pnpm --filter admin build`. Expect success.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/components/content/ProgramForm.tsx apps/admin/components/content/SeriesForm.tsx apps/admin/components/content/LectureForm.tsx
git commit -m "feat(admin): scroll title into view when save is blocked on a missing title"
```

---

## Self-review

- **Coverage:** series-in-program reorder → Task 3; Category ordering → Task 4; Gallery photo reorder + captions → Task 5; tree load-error retry → Task 2; focus-first-error → Task 6; API prerequisites → Task 1. All five flagged gaps mapped.
- **No schema changes:** all reorders/captions write existing columns (`categories.position`, `photos.position`, `photos.caption`, `series.position`).
- **Type consistency:** `setCategoryPositions`/`setPhotoPositions`/`updatePhoto` defined in Task 1, consumed in Tasks 4/5; `setSeriesPositions` (pre-existing) reused in Task 3 with the verified full-list-rewrite pattern.
- **Placeholder scan:** UI tasks (4, 5) instruct reading the target file first because exact state-variable names live there; the reorder/caption logic and API calls are fully specified.
