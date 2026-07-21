# Mobile Premium Redesign — Plan 3: Offline, Gallery/Reader/Bookmarks, Settings, Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Each task ends with `pnpm --filter mobile typecheck` (+ Jest for Task 10) + commit; steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship real offline downloads, the Gallery/Reader/Bookmarks/Settings work, the cross-cutting cleanup (including theming the shared row components so dark mode is finally complete), and a seed Jest suite for the pure high-risk logic.

**Architecture:** Two new providers (`DownloadsProvider`, `BookmarksProvider`) wired into the root; the player prefers a local file when a lecture is downloaded; a `DownloadButton` bound to downloads state; screen migrations onto the Plan-1 foundation; a jest-expo config testing the pure reducers.

**Tech Stack:** Expo SDK 57 (`expo-file-system`, `expo-image`, `expo-haptics`, `Share`, `Linking`), the Plan-1 foundation + Plan-2 player context, jest-expo.

## Global Constraints

- **Read Expo v57 docs** (`https://docs.expo.dev/versions/v57.0.0/`) before writing `expo-file-system` (download/resumable, paths), `expo-image` (placeholder/transition/cachePolicy), `Linking`/`Share`, and jest-expo config. `expo-file-system` had API changes across SDKs — verify the SDK-57 API (e.g. `File`/`Directory` class API vs legacy `downloadAsync`/`createDownloadResumable`) against the installed types before writing.
- **Consume the foundation:** `useTheme()` + `components/ui/*`; dark-mode safe (no raw `greenMid`/hardcoded surface for text; brand green/gold + on-brand white OK); prefer `AppText` variants over raw font sizes.
- **No DB schema changes.** Blurhash uses `expo-image` fade `transition` + placeholder color (NOT a stored blurhash — deferred). Bookmarks/downloads persist to AsyncStorage via `lib/storage`.
- **No admin/backend changes.** No mobile app breakage: keep real playback + Plan-1/2 behavior intact.
- **Per-task gate:** `pnpm --filter mobile typecheck` passes; Task 10 also runs `pnpm --filter mobile test` (jest). Runtime (download/offline/gesture) is QA.

## File structure

**Create:** `apps/mobile/lib/downloads.tsx`, `apps/mobile/lib/bookmarks.tsx`, `apps/mobile/components/DownloadButton.tsx`, `apps/mobile/lib/reducers/downloads.ts` (pure), `apps/mobile/jest.config.js` + `apps/mobile/lib/__tests__/*.test.ts`.
**Modify:** `apps/mobile/app/_layout.tsx` (providers), `apps/mobile/lib/player.tsx` (prefer local file), `apps/mobile/app/(tabs)/downloads.tsx`, `apps/mobile/app/series/[id].tsx` + `apps/mobile/app/player.tsx` (DownloadButton), `apps/mobile/app/gallery/index.tsx` + `[id].tsx`, `apps/mobile/app/reader/[id].tsx`, `apps/mobile/app/settings.tsx`, `apps/mobile/app/(tabs)/library.tsx` (Saved), the shared row components (`LectureListRow`/`SeriesListRow`/`FilterChips`/`GradientCover`), `apps/mobile/lib/storage.ts` (keys), `apps/mobile/package.json` (jest deps + test script).

---

## Task 1: Downloads reducer (pure) + tests-ready state model

**Files:** Create `apps/mobile/lib/reducers/downloads.ts`. (This is the pure core, isolated so Task 10 can unit-test it.)

**Interfaces — Produces:**
- `type DownloadStatus = "idle" | "queued" | "downloading" | "downloaded" | "failed"`
- `interface DownloadEntry { id: string; status: DownloadStatus; progress: number; localUri?: string; bytes?: number; error?: string }`
- `type DownloadsState = Record<string, DownloadEntry>`
- Pure action reducer: `downloadsReducer(state, action)` with actions `{type:"queue", id}`, `{type:"start", id}`, `{type:"progress", id, progress}`, `{type:"done", id, localUri, bytes}`, `{type:"fail", id, error}`, `{type:"remove", id}`, `{type:"hydrate", state}`.
- Selectors: `isDownloaded(state, id): boolean`, `downloadedIds(state): string[]`, `totalBytes(state): number`, `activeCount(state): number` (queued+downloading).

- [ ] **Step 1: Implement the reducer + selectors** (pure, no I/O):
```ts
export type DownloadStatus = "idle" | "queued" | "downloading" | "downloaded" | "failed";
export interface DownloadEntry { id: string; status: DownloadStatus; progress: number; localUri?: string; bytes?: number; error?: string; }
export type DownloadsState = Record<string, DownloadEntry>;

export type DownloadsAction =
  | { type: "queue"; id: string }
  | { type: "start"; id: string }
  | { type: "progress"; id: string; progress: number }
  | { type: "done"; id: string; localUri: string; bytes?: number }
  | { type: "fail"; id: string; error: string }
  | { type: "remove"; id: string }
  | { type: "hydrate"; state: DownloadsState };

const upsert = (s: DownloadsState, id: string, patch: Partial<DownloadEntry>): DownloadsState => ({
  ...s,
  [id]: { id, status: "idle", progress: 0, ...s[id], ...patch },
});

export function downloadsReducer(state: DownloadsState, a: DownloadsAction): DownloadsState {
  switch (a.type) {
    case "queue": return upsert(state, a.id, { status: "queued", progress: 0, error: undefined });
    case "start": return upsert(state, a.id, { status: "downloading" });
    case "progress": return upsert(state, a.id, { status: "downloading", progress: Math.min(1, Math.max(0, a.progress)) });
    case "done": return upsert(state, a.id, { status: "downloaded", progress: 1, localUri: a.localUri, bytes: a.bytes, error: undefined });
    case "fail": return upsert(state, a.id, { status: "failed", error: a.error });
    case "remove": { const next = { ...state }; delete next[a.id]; return next; }
    case "hydrate": return a.state;
    default: return state;
  }
}

export const isDownloaded = (s: DownloadsState, id: string) => s[id]?.status === "downloaded";
export const downloadedIds = (s: DownloadsState) => Object.values(s).filter((e) => e.status === "downloaded").map((e) => e.id);
export const totalBytes = (s: DownloadsState) => Object.values(s).reduce((n, e) => n + (e.status === "downloaded" ? e.bytes ?? 0 : 0), 0);
export const activeCount = (s: DownloadsState) => Object.values(s).filter((e) => e.status === "queued" || e.status === "downloading").length;
```

- [ ] **Step 2: Verify** — `pnpm --filter mobile typecheck`. Commit:
```bash
git add apps/mobile/lib/reducers/downloads.ts
git commit -m "feat(mobile): pure downloads reducer + selectors (offline state model)"
```

---

## Task 2: DownloadsProvider (engine) + wire into root

**Files:** Create `apps/mobile/lib/downloads.tsx`; modify `apps/mobile/lib/storage.ts` (add `downloads` key) + `apps/mobile/app/_layout.tsx` (provider).

**Interfaces — Produces:**
- `useDownloads(): { state: DownloadsState; download(l: Playable): void; remove(id: string): void; clearAll(): void; entry(id): DownloadEntry | undefined; localUri(id): string | undefined }`
- `<DownloadsProvider>` wrapping the app (inside ThemeProvider, alongside PlayerProvider — order so the player can read downloads; see Task 3).

- [ ] **Step 1: Read `expo-file-system` v57 API** from the docs/types — confirm how to: build an app-documents path, download a URL to a file with progress, delete a file, and check existence. Use the SDK-57 API (verify legacy `createDownloadResumable`/`downloadAsync` vs the new `File`/`Directory` API — write to whichever the installed version exposes).

- [ ] **Step 2: Implement the provider** — holds `state` via `useReducer(downloadsReducer, {})`; hydrates from `loadJSON(StorageKeys.downloads, {})` on mount and persists on change (debounced/onchange `saveJSON`). `download(l)`:
  - Skip if already downloaded/downloading.
  - Dispatch `queue`; a small in-flight set enforces concurrency cap 2 (queue the rest; a `useEffect` drains the queue as slots free).
  - When a slot is free: dispatch `start`; download `l.mediaUrl` to `<docdir>/lectures/<id>.<ext>` with a progress callback → dispatch `progress`; on success dispatch `done` with the local uri + file size; on error dispatch `fail`. Fire `Haptics.impactAsync(Light)` on start/success.
  - `remove(id)`: delete the file (best-effort) + dispatch `remove`. `clearAll()`: remove every downloaded file + reset.
  - On mount, reconcile: if a persisted `downloaded` entry's file no longer exists, drop it (dispatch `remove`).
  - `localUri(id)`: the stored local uri when downloaded, else undefined.

- [ ] **Step 3: storage key** — add `downloads: "downloads"` to `StorageKeys`.

- [ ] **Step 4: Wire the provider** into `_layout.tsx` — place `DownloadsProvider` so `PlayerProvider` is INSIDE it (player reads downloads in Task 3). New order: `… ThemeProvider > I18nProvider > DownloadsProvider > PlayerProvider > CatalogProvider > …`.

- [ ] **Step 5: Verify + commit**
```bash
pnpm --filter mobile typecheck
git add apps/mobile/lib/downloads.tsx apps/mobile/lib/storage.ts apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): DownloadsProvider — expo-file-system engine, queue, persistence, reconcile"
```

---

## Task 3: Player prefers local file when downloaded

**Files:** Modify `apps/mobile/lib/player.tsx`.

- [ ] **Step 1:** In `startPlayback`/`play`, resolve the source: `const src = downloads.localUri(lecture.id) ?? lecture.mediaUrl;` and use `src` for `player.replace({ uri: src })`. Consume `useDownloads()` (provider is now an ancestor of PlayerProvider per Task 2). Keep lock-screen artwork/metadata + resume logic unchanged. If `src` is a local `file://` uri, playback works offline.
- [ ] **Step 2: Verify + commit**
```bash
pnpm --filter mobile typecheck
git add apps/mobile/lib/player.tsx
git commit -m "feat(mobile): player prefers downloaded local file when available (offline playback)"
```

---

## Task 4: DownloadButton + wire into player & series

**Files:** Create `apps/mobile/components/DownloadButton.tsx`; modify `apps/mobile/app/player.tsx` (secondary row), `apps/mobile/app/series/[id].tsx` (per-episode + Download-All).

**Interfaces — Produces:**
- `DownloadButton({ lecture: Playable; size?: number; showLabel?: boolean })` — reads `useDownloads().entry(lecture.id)`; renders: idle → download icon; queued/downloading → a progress ring (use `progress`) or spinner; downloaded → check icon; failed → retry icon. Tap: idle→`download(lecture)`, downloaded→confirm→`remove(id)`, failed→`download` again. Themed + haptic.

- [ ] **Step 1: Implement `DownloadButton`** using the primitives + `useDownloads`. A simple circular progress can be an SVG-free ring (an outer circle + a rotating/filling arc is complex without SVG — acceptable: show a small determinate bar or a percentage text + spinner while downloading; a check when done). Keep it compact.
- [ ] **Step 2: Player** — add `DownloadButton` back to the secondary row (Speed / Sleep / **Download** / Share) using `current`.
- [ ] **Step 3: Series** — add a per-episode `DownloadButton` on each row; re-add a "Download all" in the hero that calls `download` for each episode (respecting the concurrency queue). Bind states to real download status (no dead controls).
- [ ] **Step 4: Verify + commit**
```bash
pnpm --filter mobile typecheck
git add apps/mobile/components/DownloadButton.tsx apps/mobile/app/player.tsx "apps/mobile/app/series/[id].tsx"
git commit -m "feat(mobile): DownloadButton wired into player + series (real download states)"
```

---

## Task 5: Downloads tab (real)

**Files:** Modify `apps/mobile/app/(tabs)/downloads.tsx`.

- [ ] **Step 1:** Rebuild onto primitives/theme + `useDownloads` + catalog (to resolve a downloaded id → its `Playable` for the row). Sections: a "Downloading" section (entries with status queued/downloading + progress) and a "Downloaded" list (reuse a lecture row; tap plays via `play`; trailing `DownloadButton`/checkmark + remove). A **storage-used footer** showing `totalBytes(state)` formatted (MB/GB). A "Clear all" action (confirm → `clearAll`). Offline-aware, unified `EmptyState` when nothing downloaded. Bottom padding clears the absolute tab bar + mini-player.
- [ ] **Step 2: Verify + commit**
```bash
pnpm --filter mobile typecheck
git add "apps/mobile/app/(tabs)/downloads.tsx"
git commit -m "feat(mobile): real Downloads tab — downloading/downloaded lists, storage used, clear-all"
```

---

## Task 6: BookmarksProvider + Saved view + affordances

**Files:** Create `apps/mobile/lib/bookmarks.tsx`; modify `apps/mobile/lib/storage.ts` (`bookmarks` key), `apps/mobile/app/_layout.tsx` (provider), `apps/mobile/app/(tabs)/library.tsx` (Saved segment), `apps/mobile/components/LectureListRow.tsx` (bookmark affordance) — reader wiring is Task 8.

**Interfaces — Produces:**
- `useBookmarks(): { ids: string[]; isBookmarked(id): boolean; toggle(id): void }` — persisted to `StorageKeys.bookmarks` (`string[]`). Pure add/remove helper `toggleId(ids, id)` exported for Task 10's test.

- [ ] **Step 1:** Implement the provider (a `string[]` state, hydrate + persist; `toggle` fires haptic). Add `bookmarks: "bookmarks"` to `StorageKeys`. Wire `<BookmarksProvider>` into `_layout.tsx` (near DownloadsProvider).
- [ ] **Step 2: Saved view** — add a "Saved" segment/section to Library listing bookmarked lectures (resolve ids → `Playable` via catalog); empty state when none.
- [ ] **Step 3: Affordance** — add a bookmark toggle (outline/filled) to `LectureListRow` (and/or the lecture rows used in Library/Search) via `useBookmarks`.
- [ ] **Step 4: Verify + commit**
```bash
pnpm --filter mobile typecheck
git add apps/mobile/lib/bookmarks.tsx apps/mobile/lib/storage.ts apps/mobile/app/_layout.tsx "apps/mobile/app/(tabs)/library.tsx" apps/mobile/components/LectureListRow.tsx
git commit -m "feat(mobile): bookmarks — provider, Saved view in Library, row toggle"
```

---

## Task 7: Gallery — expo-image + balanced masonry + lightbox

**Files:** Modify `apps/mobile/app/gallery/index.tsx`, `apps/mobile/app/gallery/[id].tsx`.

- [ ] **Step 1: Read both files.** Album detail currently uses bare `<Image>`, `i % 2` masonry, no lightbox, flat solid hero.
- [ ] **Step 2: expo-image** — replace `<Image>` with `expo-image`'s `Image` using `contentFit`, `transition={200}` (fade-in), `cachePolicy="memory-disk"`, and a neutral `placeholder` (a solid theme color / the album gradient) — NO stored blurhash (deferred, no schema change). Apply to gallery index cards + album photos.
- [ ] **Step 3: Balanced masonry** — replace `i % 2` with shorter-column packing: track running column heights (sum of `1/aspect`) and push each photo into the currently-shorter column.
- [ ] **Step 4: Lightbox** — tapping a photo opens a full-screen viewer with pinch-zoom + pan + swipe between photos. Use gesture-handler + Reanimated (a pinch/pan modal) OR a small pager; verify the API. Themed dark backdrop; close on swipe-down/tap.
- [ ] **Step 5: Header + theme** — album hero via the shared `Header` (gradient + watermark) instead of the flat solid block; migrate text/skeletons onto primitives; skeleton grid while loading.
- [ ] **Step 6: Verify + commit**
```bash
pnpm --filter mobile typecheck
git add apps/mobile/app/gallery
git commit -m "feat(mobile): gallery — expo-image fade+cache, balanced masonry, lightbox, shared header"
```

---

## Task 8: Reader — dark mode, progress, persisted scroll, font sheet, bookmark

**Files:** Modify `apps/mobile/app/reader/[id].tsx`.

- [ ] **Step 1: Read the file** — sepia paper theme, A/A font stepper, dead bookmark, no progress/persist.
- [ ] **Step 2: Theme-aware paper** — paper (light) vs a warm dark (dark mode) driven by `useTheme().scheme`; a sun/moon toggle in the top bar to override reading theme locally (persist the reader-theme choice). Keep the bismillah/drop-cap/divider craft.
- [ ] **Step 3: Reading progress** — a scroll-driven hairline under the top bar (scrollY / contentHeight).
- [ ] **Step 4: Persist scroll** — save the scroll offset per lecture id (a new `StorageKeys.readerScroll` map) and restore on open (like audio resume).
- [ ] **Step 5: Font size sheet** — replace/augment the A/A stepper with a `@gorhom/bottom-sheet` picker of sizes (persist the choice).
- [ ] **Step 6: Bookmark** — wire the (previously dead) bookmark button to `useBookmarks().toggle(id)` / `isBookmarked(id)` (outline↔filled).
- [ ] **Step 7: Verify + commit**
```bash
pnpm --filter mobile typecheck
git add "apps/mobile/app/reader/[id].tsx" apps/mobile/lib/storage.ts
git commit -m "feat(mobile): reader — dark/night mode, progress bar, persisted scroll, font sheet, real bookmark"
```

---

## Task 9: Settings — real values + theme toggle + Share/Contact

**Files:** Modify `apps/mobile/app/settings.tsx`.

- [ ] **Step 1: Migrate** onto primitives/theme (dark-mode safe; the `Row` helper + header via tokens).
- [ ] **Step 2: Theme toggle** — a "Appearance" row → `System / Light / Dark` control wired to `useThemeMode().mode`/`setMode` (a segmented control or a bottom-sheet picker).
- [ ] **Step 3: Real Wi-Fi-only** — persist the toggle (`StorageKeys` new `wifiOnly`); expose it (the downloads engine can read it later — for now persist + honor if trivial, else just persist the preference).
- [ ] **Step 4: Real storage-used** — replace the hardcoded "1.4 GB" with `formatBytes(totalBytes(useDownloads().state))`; "Manage downloads" row navigates to the Downloads tab.
- [ ] **Step 5: Wire Share + Contact** — Share via `Share.share({ message, url? })`; Contact via `Linking.openURL("mailto:althaqalaynfoundation@gmail.com")` (use the Foundation email already used in the privacy policy). Content-language row reflects the real setting.
- [ ] **Step 6: Verify + commit**
```bash
pnpm --filter mobile typecheck
git add apps/mobile/app/settings.tsx apps/mobile/lib/storage.ts
git commit -m "feat(mobile): settings — theme toggle, real storage used, persisted wifi-only, wired Share/Contact"
```

---

## Task 10: Cross-cutting cleanup + theme the shared components

**Files:** Modify `apps/mobile/components/LectureListRow.tsx`, `SeriesListRow.tsx`, `FilterChips.tsx`, `GradientCover.tsx`; `apps/mobile/lib/player.tsx` (lock-screen); `apps/mobile/app/(tabs)/index.tsx` + `library.tsx` (error-keeps-cached + mini-player padding).

- [ ] **Step 1: Theme the shared row components** — make `LectureListRow`, `SeriesListRow`, `FilterChips`, and `GradientCover` consume `useTheme()` (or swap `GradientCover`→`CoverArt`) so they render correctly in dark mode. This is what finally makes dark mode complete across Home/Library/Search/series. Preserve their existing props/call sites.
- [ ] **Step 2: Lock-screen flicker** — in `lib/player.tsx`, activate lock-screen once and call `player.updateLockScreenMetadata(...)` on subsequent `current` changes (instead of deactivate/reactivate every change); deactivate only when `current` becomes null / on unmount.
- [ ] **Step 3: Error keeps cached content** — on Home + Library, when `catalog.error` is set BUT data already exists, keep showing the lists with a small inline error/offline banner + Retry, instead of replacing everything with a full-screen EmptyState (only show the full EmptyState when there's an error AND no data).
- [ ] **Step 4: Mini-player bottom padding** — Home + Library: add `MINI_PLAYER_HEIGHT + MINI_PLAYER_GAP` to the scroll bottom padding (match series/Search) so the last row clears the mini-player during playback.
- [ ] **Step 5: Font-size literals** — where cheap, replace bare `fontSize` numeric literals on `AppText` in the migrated screens with the nearest `typePresets` variant (don't force pixel-identical; use judgment). (If too churny, note what remains.)
- [ ] **Step 6: Verify + commit**
```bash
pnpm --filter mobile typecheck
git add -A
git commit -m "refactor(mobile): theme shared rows (dark mode complete) + lock-screen updateMetadata + error-keeps-cache + mini-player padding"
```

---

## Task 11: Jest seed tests for pure logic

**Files:** Modify `apps/mobile/package.json` (jest-expo devDep + `test` script); create `apps/mobile/jest.config.js` + `apps/mobile/lib/__tests__/downloads.test.ts`, `bookmarks.test.ts`, `sleepTimer.test.ts` (if a pure sleep helper was extracted; otherwise test `progressFor`/format helpers).

- [ ] **Step 1: Read jest-expo v57 setup** from the docs. Add `jest-expo` (matching SDK 57) + `jest` devDeps; `package.json` `"test": "jest"`; `jest.config.js` with `preset: "jest-expo"` (and `transformIgnorePatterns` per the docs so RN/Expo modules transform). Keep it minimal — only the pure `lib/reducers` + `lib/*` pure functions are tested (no component render).
- [ ] **Step 2: downloads.test.ts** — cover `downloadsReducer` transitions (queue→start→progress clamp→done sets downloaded+localUri; fail; remove deletes key; hydrate) + selectors (`isDownloaded`, `downloadedIds`, `totalBytes` sums only downloaded, `activeCount`).
- [ ] **Step 3: bookmarks.test.ts** — `toggleId(ids, id)` adds then removes; idempotent per call.
- [ ] **Step 4: pure helper test** — test `formatBytes`/`formatTime` and, if extracted, the sleep-timer decrement logic. (Theme token resolution is already covered by vitest in `packages/theme`.)
- [ ] **Step 5: Verify** — `pnpm --filter mobile test` (jest) green + `pnpm --filter mobile typecheck`. Commit:
```bash
git add apps/mobile/package.json apps/mobile/jest.config.js apps/mobile/lib/__tests__
git commit -m "test(mobile): jest-expo seed — downloads reducer, bookmarks, format helpers"
```

---

## Self-review

- **Spec coverage (Plan 3 slice):** offline engine (§6)→Tasks 1-5; bookmarks + Saved (§7)→Task 6, 8; gallery expo-image/masonry/lightbox (§7)→Task 7; reader dark/progress/persist/font/bookmark (§7)→Task 8; settings real values + theme toggle + Share/Contact (§8)→Task 9; cross-cutting cleanup incl. shared-component theming + the Plan-2 deferrals (§8 + review roll-up)→Task 10; Jest seed (§testing)→Task 11. Together with Plans 1-2, the whole spec is covered.
- **Placeholder scan:** net-new engines (downloads reducer/provider, bookmarks) carry real code/interfaces; screen migrations are read-then-migrate prose (their internals live in the files, patterns established in Plans 1-2) with concrete required behaviors.
- **Type consistency:** `DownloadsState`/`DownloadEntry`/`DownloadStatus` + reducer (Task 1) consumed by the provider (Task 2), player (Task 3), DownloadButton (Task 4), Downloads tab (Task 5), settings (Task 9), tests (Task 11); `useBookmarks` (Task 6) consumed by Library + reader (Task 8) + tests. Provider order (Downloads outside Player) fixed in Task 2 so Task 3 can consume it.
- **Constraints:** no schema change (blurhash via expo-image transition, not stored); no admin/backend changes; dark-mode completion is Task 10; expo-file-system + jest-expo APIs verified against v57 before writing.
- **Deferred/again-noted:** real per-lecture lock-screen artwork (generated→image) and queue auto-advance remain out (documented in the spec's non-goals / Plan-2 notes); real blurhash needs a future `photos.blurhash` column.
