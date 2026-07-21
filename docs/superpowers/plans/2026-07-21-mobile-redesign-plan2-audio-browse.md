# Mobile Premium Redesign — Plan 2: Audio & Browse

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Each task ends with `pnpm --filter mobile typecheck` + commit; steps use checkbox (`- [ ]`) syntax.

**Goal:** Deliver the premium listening experience (player context + now-playing screen + mini-player + series detail) and migrate the three browse screens (Home/Library/Search) onto the Plan 1 foundation, resolving the dark-mode "mixed chrome" gap.

**Architecture:** Extend `PlayerContext` (queue, progress, functional sleep timer, lock-screen metadata, buffering); redesign the player/mini-player/series screens; rebuild Home/Library/Search as consumers of the `components/ui/*` primitives + `useTheme()` with skeletons, retry, and pull-to-refresh. Depends entirely on Plan 1 (merged).

**Tech Stack:** Expo SDK 57, expo-audio (lock-screen via `setActiveForLockScreen`/`updateLockScreenMetadata`), Reanimated 4.5 + Gesture Handler 2.32 (drag scrubber, shared-element morph), @gorhom/bottom-sheet (speed/sleep pickers), the Plan 1 primitives.

## Global Constraints

- **Read Expo v57 docs** (`https://docs.expo.dev/versions/v57.0.0/`) before writing any expo-audio / gesture / reanimated API. `expo-audio` lock-screen API confirmed present: `player.setActiveForLockScreen(active: boolean, metadata?: { title; artist?; albumTitle?; artworkUrl? }, options?)` + `player.updateLockScreenMetadata(metadata)`. Verify the exact `AudioMetadata`/`AudioLockScreenOptions` field names against the installed `expo-audio` types before use.
- **Consume the Plan 1 foundation:** `useTheme()`, `components/ui/*` primitives (`AppText`, `Icon`, `Touchable`, `Card`, `Header`, `EmptyState`, `Skeleton`, `Chip`, `Button`, `CoverArt`). No raw font sizes / hardcoded surface colors in migrated screens — use theme tokens. Brand green/gold + `#fff`-on-brand are allowed.
- **Transcripts removed** (design decision): delete the fake transcript panel + the `transcriptOpen`/`toggleTranscript` state. Do NOT wire real transcripts (later).
- **Downloads deferred to Plan 3:** do not implement the download engine here. The player/series download affordances are added in Plan 3 — for now, remove/omit dead download controls (don't ship no-op buttons). Share is wired (`Share.share()`).
- **Preserve real playback:** the expo-audio integration in `lib/player.tsx` (resume persistence, speed, background mode) must keep working; extensions are additive.
- **Per-task gate:** `pnpm --filter mobile typecheck` passes. No RN-render tests (Plan 3 seeds Jest). Runtime audio/gesture/lock-screen behavior is QA.
- **Screens still un-migrated by end of Plan 2** (gallery, reader, settings, downloads) keep working off `colors` — don't break them.

---

## File structure

**Modify:**
- `apps/mobile/lib/player.tsx` — queue, `progressFor`, functional sleep timer, buffering, lock-screen metadata; drop transcript state.
- `apps/mobile/app/player.tsx` — full redesign onto theme/primitives + drag scrubber + sleep/speed sheets + queue transport; drop transcript panel; wire Share.
- `apps/mobile/components/MiniPlayer.tsx` — progress hairline + shared-element morph + theme.
- `apps/mobile/app/series/[id].tsx` — playing/played/progress states + Continue chip + queue wiring + primitives.
- `apps/mobile/app/(tabs)/index.tsx` — Home migration.
- `apps/mobile/app/(tabs)/library.tsx` — Library migration.
- `apps/mobile/app/(tabs)/search.tsx` — Search migration.

**Create:**
- `apps/mobile/components/player/Scrubber.tsx` — the draggable seek bar.
- `apps/mobile/components/player/ValueSheet.tsx` — a bottom-sheet list picker (used by speed + sleep).

---

## Task 1: Player context — queue, progress, sleep timer, buffering, lock-screen

**Files:**
- Modify: `apps/mobile/lib/player.tsx`
- Read first: `apps/mobile/lib/catalog.ts` (the `Playable` type) — already known.

**Interfaces — Produces (extended `PlayerValue`):**
Keep all existing fields/methods EXCEPT remove `transcriptOpen` + `toggleTranscript`. Add:
- `queue: Playable[]` and `queueIndex: number`
- `playSeries(episodes: Playable[], startIndex: number): void` — sets the queue and plays `episodes[startIndex]`.
- `next(): void` / `prev(): void` — advance/retreat within the queue (no-op at ends).
- `hasNext: boolean` / `hasPrev: boolean`
- `progressFor(id: string): number` — saved resume fraction for a lecture (0 if none).
- `buffering: boolean`
- `setSleepMinutes(min: number): void` — set an explicit sleep duration (replaces cycle-only); keep `cycleSleep` for the tap.
- `sleepRemainingSec: number` — live countdown seconds (0 when off).
- `setSpeedValue(s: number): void` — explicit speed set (for the sheet); keep `cycleSpeed`.

- [ ] **Step 1: Remove transcript state** — delete `transcriptOpen`, `setTranscriptOpen`, `toggleTranscript` from state, the `value` object, and the `PlayerValue` interface. (The player screen drops the panel in Task 2.)

- [ ] **Step 2: Add queue state + playSeries/next/prev**
```tsx
const [queue, setQueue] = useState<Playable[]>([]);
const [queueIndex, setQueueIndex] = useState(-1);

const playSeries = useCallback((episodes: Playable[], startIndex: number) => {
  setQueue(episodes);
  setQueueIndex(startIndex);
  play(episodes[startIndex]);
}, [play]);

const playAt = useCallback((index: number) => {
  if (index < 0 || index >= queue.length) return;
  setQueueIndex(index);
  play(queue[index]);
}, [queue, play]);

const next = useCallback(() => playAt(queueIndex + 1), [playAt, queueIndex]);
const prev = useCallback(() => playAt(queueIndex - 1), [playAt, queueIndex]);
const hasNext = queueIndex >= 0 && queueIndex < queue.length - 1;
const hasPrev = queueIndex > 0;
```
Also: single-lecture `play(lecture)` should reset the queue to `[lecture]` with index 0 (so `hasNext/hasPrev` are false) — set `setQueue([lecture]); setQueueIndex(0);` at the top of `play` (or have `play` not touch the queue and only `playSeries` manage it; choose the former so mini-player/Home single plays don't leave a stale queue). Keep `play` otherwise unchanged.

- [ ] **Step 3: `progressFor`** — expose the saved resume map:
```tsx
const progressFor = useCallback((id: string) => resumeRef.current[id] ?? 0, []);
```

- [ ] **Step 4: Buffering** — derive from expo-audio status. `useAudioPlayerStatus` exposes loading/buffering; read the exact field from the v57 types (likely `status.isBuffering` or `!status.isLoaded`). Add `const [buffering, setBuffering] = useState(false)` and set it in the existing status effect: `setBuffering(hasAudio && (!status.isLoaded || status.isBuffering === true))` (adapt to the real field name).

- [ ] **Step 5: Functional sleep timer** — replace the cosmetic `sleep` with a real countdown:
```tsx
const [sleepRemainingSec, setSleepRemainingSec] = useState(0);

const setSleepMinutes = useCallback((min: number) => {
  setSleep(min);
  setSleepRemainingSec(min * 60);
}, []);

// countdown: ticks only while playing and armed; pauses playback at 0.
useEffect(() => {
  if (sleep <= 0 || !isPlaying) return;
  const id = setInterval(() => {
    setSleepRemainingSec((s) => {
      if (s <= 1) {
        // stop playback
        if (hasAudio) player.pause(); else setIsPlaying(false);
        setSleep(0);
        return 0;
      }
      return s - 1;
    });
  }, 1000);
  return () => clearInterval(id);
}, [sleep, isPlaying, hasAudio, player]);
```
Keep `cycleSleep` but have it call `setSleepMinutes(nextValue)` so cycling also arms the countdown.

- [ ] **Step 6: Explicit speed setter** — `const setSpeedValue = useCallback((s: number) => setSpeed(s), []);` (the existing speed effect already applies + persists it). Keep `cycleSpeed`.

- [ ] **Step 7: Lock-screen metadata** — when `current` changes and it has audio, activate lock-screen controls with metadata; update on change; deactivate when cleared. Verify the exact API/field names against installed `expo-audio` types.
```tsx
useEffect(() => {
  if (!current || !current.mediaUrl) return;
  try {
    player.setActiveForLockScreen(true, {
      title: current.title,
      artist: current.seriesTitle ?? current.sub,
      albumTitle: current.seriesTitle ?? "Althaqalayn Lectures",
      // artworkUrl: omitted for now — generated covers have no URL; a static
      // bundled-logo artwork is a follow-up (needs asset→uri). Title/artist land now.
    });
  } catch { /* API shape guard */ }
  return () => { try { player.setActiveForLockScreen(false); } catch {} };
}, [current, player]);
```
If `setActiveForLockScreen`'s metadata field names differ in the installed types, adapt (the docs show `title`/`artist`/`albumTitle`/`artworkUrl`). If a static artwork is trivially available as an https/asset uri, include it; otherwise omit (title/artist is the required win).

- [ ] **Step 8: Update `value` + `PlayerValue`** — add all the new fields/methods, remove transcript ones, keep the memo deps correct.

- [ ] **Step 9: Verify** — `pnpm --filter mobile typecheck`. Expected: passes. (Note: `app/player.tsx` still references `transcriptOpen`/`toggleTranscript` until Task 2 — so THIS task will break `player.tsx`'s typecheck. To keep the gate green, in this task also remove the transcript usage from `app/player.tsx` minimally: delete the transcript `secItem` + the transcript panel + the destructured `transcriptOpen`/`toggleTranscript`. The full player redesign is Task 2; this is just the compile-fix.)

- [ ] **Step 10: Commit**
```bash
git add apps/mobile/lib/player.tsx apps/mobile/app/player.tsx
git commit -m "feat(mobile): player queue + progressFor + functional sleep timer + buffering + lock-screen metadata"
```

---

## Task 2: Scrubber + player screen redesign

**Files:**
- Create: `apps/mobile/components/player/Scrubber.tsx`, `apps/mobile/components/player/ValueSheet.tsx`
- Modify: `apps/mobile/app/player.tsx`

**Interfaces — Produces:**
- `Scrubber({ position: number; durationSec: number; onSeek: (fraction: number) => void })` — a draggable track; shows a floating time bubble above the knob while dragging; haptic tick on release; renders the played fill + knob; theme-aware.
- `ValueSheet` — a `@gorhom/bottom-sheet` modal presenting a labelled value list; props `{ title: string; options: { label: string; value: number }[]; selected: number; onSelect: (v: number) => void }` exposed via a ref (`present()/dismiss()`), or a controlled `visible` prop — choose the simplest that works with `BottomSheetModalProvider`.

- [ ] **Step 1: `Scrubber.tsx`** — use `react-native-gesture-handler` `Gesture.Pan()` + Reanimated shared values. On pan begin, enter "scrubbing"; track `x` → fraction; render a bubble showing `formatTime(fraction*durationSec)` above the knob; on end, call `onSeek(fraction)` + `Haptics.selectionAsync()`. While not scrubbing, reflect `position`. Use `useTheme()` for colors (gold fill `t.c.accent`, inactive `t.c.trackInactive`, `#fff` knob). Read the Gesture Handler v2 + Reanimated 4 API from docs; use `GestureDetector`.

- [ ] **Step 2: `ValueSheet.tsx`** — a `BottomSheetModal` (from `@gorhom/bottom-sheet`) with a title + a list of `Touchable` rows (checkmark on the selected). Themed via `useTheme()`. Expose an imperative `present()` via `forwardRef`/`useImperativeHandle`, or a `visible`+`onClose` controlled API. Verify the bottom-sheet v5 modal API from docs.

- [ ] **Step 3: Rebuild `app/player.tsx`** onto theme + primitives + the new context:
  - Replace the 3-icon-family transport with a single family (Ionicons for skip/play/pause; MaterialCommunityIcons only for `rewind-15`/`fast-forward-30`).
  - **Artwork:** use `<CoverArt gradient={current.gradient} glyph={current.ar} size={270} radius={t.radii.hero} />` inside the `RotatingRing` (keep the ring), giving the lit/vignette look.
  - **Scrubber:** replace the tap-only `Pressable` track with `<Scrubber position={position} durationSec={current.durSec} onSeek={seekTo} />`.
  - **Transport:** wire skip-back/skip-forward to `prev()`/`next()`, disabled (dimmed) when `!hasPrev`/`!hasNext`; rewind-15/ff-30 keep `nudge`; big play uses `togglePlay` and shows a buffering spinner when `buffering`.
  - **Secondary row:** Speed (tap `cycleSpeed`, long-press → `ValueSheet` of `[0.75,1,1.25,1.5,2]` → `setSpeedValue`); Sleep (tap `cycleSleep`, long-press → `ValueSheet` of `[0,15,30,45,60]` min → `setSleepMinutes`; when armed, show the live `formatTime(sleepRemainingSec)` "Stops in …" instead of the static `{sleep}m`); Share (`Share.share({ message: current.title })` — wire it). NO download button here (Plan 3). NO transcript.
  - **Header/back:** unified round back button + "NOW PLAYING" / series label (keep the style but via theme tokens).
  - Keep `StatusBar style="light"` (player is always dark).

- [ ] **Step 4: Verify** — `pnpm --filter mobile typecheck`. Expected: passes.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/components/player apps/mobile/app/player.tsx
git commit -m "feat(mobile): player redesign — drag scrubber, sleep/speed sheets, queue transport, CoverArt, share; drop transcript"
```

---

## Task 3: Mini-player — progress hairline + morph + theme

**Files:**
- Modify: `apps/mobile/components/MiniPlayer.tsx`, and add a shared-element tag to the player artwork in `apps/mobile/app/player.tsx`.

- [ ] **Step 1: Progress hairline** — add a 2px gold (`colors.goldLight`) bar pinned to the bottom edge of the mini-player bar, width `${position * 100}%` (consume `position` from `usePlayer()`). Round the bottom corners to match.

- [ ] **Step 2: Theme + CoverArt** — swap the `GradientCover` for `<CoverArt gradient={current.gradient} glyph={current.ar} size={42} radius={t.radii.md} />` (keep the `EqBars` overlay); route text through `AppText`; keep the green bar (brand) but pull incidental colors from theme where sensible. Keep the shared layout offset from `lib/layout`.

- [ ] **Step 3: Shared-element morph** — add `sharedTransitionTag="np-cover"` (Reanimated) to the mini-player cover and the player-screen artwork so navigating expands one into the other. Verify Reanimated 4 shared-element API in docs; if `sharedTransitionTag` is unavailable/unstable in RN 0.86 + Reanimated 4, fall back to leaving the existing `slide_from_bottom` and note it (do NOT block the task on a flaky API — a working slide is acceptable; the morph is a nice-to-have).

- [ ] **Step 4: Verify + Commit**
```bash
pnpm --filter mobile typecheck
git add apps/mobile/components/MiniPlayer.tsx apps/mobile/app/player.tsx
git commit -m "feat(mobile): mini-player progress hairline + CoverArt/theme + shared-element cover morph"
```

---

## Task 4: Series detail — playing/played/progress states + Continue + queue

**Files:**
- Modify: `apps/mobile/app/series/[id].tsx`
- Read first: the whole file (hero + episode rows + Play-All).

**Interfaces:** consumes `usePlayer()` (`playSeries`, `current`, `progressFor`, `isPlaying`), `useContentTree`/catalog episode data, primitives, `EqBars`.

- [ ] **Step 1: Read the file** — note how episodes are listed, how Play-All works, and how a row maps to a `Playable`.

- [ ] **Step 2: Queue wiring** — "Play All" calls `playSeries(episodes, 0)`; tapping an episode row calls `playSeries(episodes, index)` (so prev/next work in the player). Build the `Playable[]` in list order.

- [ ] **Step 3: Row states** — for each episode row:
  - If `current?.id === episode.id`: show an `EqBars` indicator + highlight the row (accent tint bg).
  - Else if `progressFor(episode.id)` is between 0 and 0.98: render a thin progress bar (gold) under the title at that fraction.
  - Played (`progressFor >= 0.98`): a subtle check / "Played" meta.
- [ ] **Step 4: Continue chip** — compute the last-played-with-progress episode in this series (max `progressFor` in (0,0.98)); if one exists, render a "Continue · Ep N · X min left" chip near the hero that calls `playSeries(episodes, thatIndex)`. Otherwise Play-All starts at 0.
- [ ] **Step 5: Primitives/theme** — migrate the hero to the shared `Header` (or keep the gradient hero but via theme tokens), rows via `Touchable`, text via `AppText`, `CoverArt` for the hero motif. Remove the dead per-episode download icon (Plan 3 adds real ones). Add bottom padding to clear the absolute tab bar isn't needed (series is a stack screen, not a tab) — but ensure content clears the mini-player if shown.

- [ ] **Step 6: Verify + Commit**
```bash
pnpm --filter mobile typecheck
git add apps/mobile/app/series/[id].tsx
git commit -m "feat(mobile): series detail — playing/progress/played states, Continue chip, queue wiring"
```

---

## Task 5: Home migration

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Read first: the whole file.

- [ ] **Step 1: Read the file** — note the header, rails (Continue, categories, featured series, events, latest), and current data hooks.

- [ ] **Step 2: Migrate onto foundation** — all text → `AppText`; covers → `CoverArt`; cards → `Card`; chips → `Chip`; tappables → `Touchable`; colors/spacing/radii → `useTheme()` tokens (remove hardcoded hexes/sizes). The screen now themes correctly in dark mode.
- [ ] **Step 3: Loading/error** — while `catalog.loading`, render **skeletons** shaped like each rail (use `Skeleton`); on `catalog.error`, render `EmptyState` with a Retry action calling `catalog.refetch()` (from Plan 1). Distinct from the empty (no-content) state.
- [ ] **Step 4: Pull-to-refresh** — wrap the scroll in a `RefreshControl` calling `catalog.refetch()`.
- [ ] **Step 5: Continue card** — use `progressFor()` for the resume fraction/progress bar; tapping opens the player via `play`/`playSeries`.
- [ ] **Step 6: Collapsing header** — convert the hero to an `Animated.ScrollView` (Reanimated) where the hero gradient scales/fades on scroll and a slim translucent (`expo-blur`) bar with logo + search icon fades in past a threshold. (If this proves heavy, a simpler sticky compact bar is acceptable — but implement the fade-in-on-scroll.)
- [ ] **Step 7: Dead "more" icon** — remove the no-op `more-vertical` on latest rows (or wire a Share action sheet). Default: remove.
- [ ] **Step 8: Lists** — keep the horizontal rails as-is (they're bounded); the vertical "Latest" list can stay a `.map()` for now (virtualization is a nice-to-have; the archive rails are bounded) OR convert to `FlatList` if straightforward. Keep the Task-1(Plan-1) bottom padding fix.

- [ ] **Step 9: Verify + Commit**
```bash
pnpm --filter mobile typecheck
git add "apps/mobile/app/(tabs)/index.tsx"
git commit -m "feat(mobile): Home migrated to foundation — theme, skeletons, retry, pull-to-refresh, collapsing header"
```

---

## Task 6: Library migration

**Files:**
- Modify: `apps/mobile/app/(tabs)/library.tsx`
- Read first: the whole file.

- [ ] **Step 1: Read the file** — note the segment `FilterChips` (Recent/Occasions/Topics/Series), the always-on filter `SearchField`, and the flat lists.
- [ ] **Step 2: Migrate onto foundation** — primitives + theme tokens; segment chips via `Chip` (add counts per segment); rows via `Touchable`/`AppText`/`CoverArt`.
- [ ] **Step 3: Series segment → year-grouped `SectionList`** — group series by `year` with sticky section headers (newest year first). The other segments stay flat lists.
- [ ] **Step 4: Collapse the filter field** — replace the always-visible free-text `SearchField` with a search icon in the segment row that expands the field on tap (reclaim vertical space).
- [ ] **Step 5: Loading/error/empty** — skeleton rows while loading; `EmptyState` + Retry on `catalog.error`; unified `EmptyState` for "no matches"/"nothing yet".
- [ ] **Step 6: Bottom padding** — keep list content clear of the absolute tab bar (`paddingBottom` already 120 — verify ≥ `TAB_BAR_HEIGHT + insets.bottom`, or switch to the shared constant).

- [ ] **Step 7: Verify + Commit**
```bash
pnpm --filter mobile typecheck
git add "apps/mobile/app/(tabs)/library.tsx"
git commit -m "feat(mobile): Library migrated — year-grouped SectionList, collapsible filter, skeletons, retry, theme"
```

---

## Task 7: Search migration

**Files:**
- Modify: `apps/mobile/app/(tabs)/search.tsx`
- Read first: the whole file.

- [ ] **Step 1: Read the file** — note the `SearchField`, media-type `FilterChips`, recent-search chips, topic grid, and result list.
- [ ] **Step 2: Migrate onto foundation** — primitives + theme; recent chips via `Chip`; topic grid via `CoverArt`+`Card`; rows via `Touchable`/`AppText`.
- [ ] **Step 3: Debounce** — debounce the query (~200ms) before filtering (a small `useEffect`/timeout or a tiny `useDebounced` helper). Fine at current scale but smooths typing.
- [ ] **Step 4: Match highlighting** — in result rows, highlight the matched substring of the title (split on the query, bold/accent the match) via `AppText` spans.
- [ ] **Step 5: Zero-results** — unified `EmptyState` (icon + "No results for '…'") instead of a bare line.
- [ ] **Step 6: Bottom padding** — clear the absolute tab bar (as Library).

- [ ] **Step 7: Verify + Commit**
```bash
pnpm --filter mobile typecheck
git add "apps/mobile/app/(tabs)/search.tsx"
git commit -m "feat(mobile): Search migrated — debounce, match highlighting, EmptyState, theme"
```

---

## Self-review

- **Spec coverage (Plan 2 slice):** player context queue/progress/sleep/buffering/lock-screen (§4 data flow + audio)→Task 1; drag scrubber + sleep/speed sheets + queue transport + CoverArt art + share + transcript-removal (§4)→Task 2; mini-player progress + morph (§3/§4)→Task 3; series detail states + Continue + queue (§4)→Task 4; Home/Library/Search migration incl. skeletons/retry/pull-to-refresh/collapsing header/year-group/debounce/highlight (§5)→Tasks 5-7. Offline downloads, gallery, reader, bookmarks, settings, cleanup, Jest = Plan 3.
- **Placeholder scan:** Task 1 carries real code for the context extension (the API shape must be exact); Tasks 2-7 mix given code (scrubber structure, lock-screen call) with read-then-migrate prose because the screens' current internals live in the files and must be matched — deliberate, and each names concrete interactions/props.
- **Type consistency:** the extended `PlayerValue` (Task 1) — `playSeries`/`next`/`prev`/`hasNext`/`hasPrev`/`progressFor`/`buffering`/`sleepRemainingSec`/`setSleepMinutes`/`setSpeedValue`, minus `transcriptOpen`/`toggleTranscript` — is consumed consistently by player.tsx (Task 2), MiniPlayer (Task 3), series (Task 4), Home (Task 5). Task 1 Step 9 fixes the transient player.tsx break so the gate stays green.
- **Non-breaking:** un-migrated screens (gallery/reader/settings/downloads) still compile off `colors`; the removed transcript is handled in the same task that removes its state.
- **Risk noted:** lock-screen artwork (generated) deferred (title/artist land); shared-element morph may fall back to slide if the Reanimated 4 API is unstable on RN 0.86 — explicitly allowed, not a blocker.
