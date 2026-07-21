# Mobile App — Premium UI/UX Redesign

**Date:** 2026-07-21
**App:** `apps/mobile` (Expo SDK 57, Expo Router, react-native-web) + `packages/theme`
**Status:** Approved design — ready for implementation plan

## Problem

The mobile app has a strong brand identity (deep-green + gold, Lora/Amiri/Mulish, watermark glyphs, sepia reader) but reads as a **beautiful prototype, not a shipped product**, for two structural reasons found in a close audit:

1. **The design system is defined but bypassed.** `packages/theme` ships type/spacing/radii/shadow tokens; mobile imports only `colors`. Result: ~17 distinct font sizes, ~18 border radii, 3 icon families mixed in one row, CSS-string shadow/gradient tokens that don't work in RN, per-screen padding drift (16/18/20/22), 3 header styles, 3 back-button styles.
2. **Many controls are placeholders that do nothing.** No-op share/download/bookmark/more/skip buttons; a sleep timer that cycles a number but never pauses; a **hardcoded fake Hausa "transcript"** shown for every lecture; a Downloads tab that is a static empty state; Settings values that are hardcoded ("1.4 GB", "Hausa & English") and non-persisted.

Plus missing premium essentials: no lock-screen/Now-Playing metadata, tap-only scrubber, no mini-player progress, no dark mode, no haptics, no press feedback, spinners instead of skeletons, no pull-to-refresh, errors that masquerade as empty content, bare `<Image>` with no placeholder/lightbox in the gallery.

User request: *"the mobile application … many opportunities for improvement. And better UI/UX to make it more premium, modern and sleek."*

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Scope | **Full premium redesign** — everything at once |
| Theming | **Light + dark**, system-aware default + `System/Light/Dark` toggle |
| Dependencies | **Add the standard set**: Reanimated + Gesture Handler, expo-image, expo-haptics, @gorhom/bottom-sheet, expo-blur |
| Offline downloads | **Build real offline** (download audio, play locally, storage mgmt) |
| Cover artwork | **Elevate generated art** (no image sourcing); real-image seam left for later |
| Transcripts | **Remove for now** (pull the fake text + panel; clean seam to reintroduce real ones later) |
| Aesthetic | **Keep & elevate** the green/gold identity (systematize, don't reinvent) |
| Reader bookmark | **Wire real bookmarks** + a saved list |
| Testing | **Manual QA checklist + seed Jest unit tests** for pure high-risk logic |

## Approach

**Foundation-first, delivered as one redesign.** Build tokens + theme context + shared primitives first (old screens keep working off `colors`, nothing breaks), then migrate screens onto the foundation, then layer new features (offline, lock-screen, dark mode) on top. Only order that keeps the app compiling throughout and ends every screen consistent.

## New dependencies

`react-native-reanimated`, `react-native-gesture-handler`, `expo-image`, `expo-haptics`, `@gorhom/bottom-sheet`, `expo-blur`. All are Expo SDK 57-supported. `reanimated` requires the Babel plugin; `gesture-handler` requires the root `GestureHandlerRootView`. These affect the EAS build config.

---

## Architecture

### 1. Design foundation: tokens + theming

**`packages/theme` gains a native layer (`native.ts`)** — RN-shaped tokens (the current shadow/gradient string tokens stay for the web admin but are not used by mobile):

- **Type scale** — named modular scale replacing ~17 ad hoc sizes: `caption 11 / meta 12 / body 14 / bodyLg 16 / cardTitle 17 / section 20 / screen 24 / display 30`. Exposed as **presets** `type.<role> = { fontFamily, fontSize, lineHeight, letterSpacing }`. Screens never write raw sizes.
- **Radii** — `sm 8 / md 14 / lg 20 / hero 26 / pill 999`, applied by role (chip/card/cover/hero/button).
- **Spacing** — `xs 4 / sm 8 / md 12 / lg 16 / xl 24 / xxl 32`; `screen = 20` (standard horizontal padding).
- **Elevation** — RN objects `elevation.sm/md/lg = { shadowColor, shadowOpacity, shadowRadius, shadowOffset, elevation }`. Android: flat elevation only; colored glow is never load-bearing (used decoratively where it degrades gracefully).
- **Motion** — `duration { fast 150, base 250, slow 400 }`; easing `standard = bezier(0.4,0,0.2,1)`, `emphasized`.
- **Color** — extract the ~10 stray one-off hexes (`#94a099`, `#c4ccc5`, `#0a3b2c`, `#072d22`, …) into named tokens; fold near-`greenDeepest` darks into existing tokens. Add **semantic tokens** resolved per theme: `bg, surface, surfaceAlt, textPrimary, textMuted, textFaint, border, borderSubtle, accent, accentText, trackInactive`.

**Theming architecture (`apps/mobile/lib/theme.tsx`)**
- Two palettes — `light` and `dark` — built from the same brand (dark = `greenDeepest`-family backgrounds, cream→off-white text, gold accent unchanged).
- `ThemeProvider` resolves the active scheme from `useColorScheme()` (default `system`) with a persisted override (`System/Light/Dark`) stored via `lib/storage`.
- `useTheme()` returns `{ c: <semantic colors>, type, radii, space, elevation, motion, scheme }`.
- `StatusBar` style and safe-area/status handling are set **once** in the provider/shell, per active scheme (removes per-screen drift).

### 2. Shared component library (`apps/mobile/components/ui/`)

All theme-aware by construction:
- **`AppText`** (variant → preset) — no raw sizes in screens.
- **`Touchable`** — wraps `Pressable`; applies press response (`opacity`/`scale 0.97`) + haptics (`selectionAsync`, or `impactAsync(Light)` for primary) + `accessibilityRole`/`accessibilityLabel` enforcement. Every tappable element routes through it.
- **`Header`** — gold-watermark green-gradient; `variant` hero|compact; unified back-button; optional collapsing behavior. Replaces the 3 header + 3 back-button styles.
- **`Card`** — canonical surface (radius/elevation/border).
- **`CoverArt`** — elevated generated cover: per-category gradient palette variety, radial lighting + vignette, subtle grain overlay, per-category glyph variety. Renders to an image for OS now-playing artwork. Real-image fallback seam (unused now).
- **`EmptyState`** — icon + title + body; used for every empty/zero-result.
- **`Skeleton`** — shimmer blocks; per-screen skeletons matching each list/rail/card shape.
- **`Chip` / `FilterChips`** — themed, press+haptic, clear active state.
- **`Button`** — primary/secondary/ghost, press+haptic, loading state.
- **`Icon`** — standardizes on Feather (MaterialCommunityIcons only for glyphs Feather lacks); consistent size/stroke; label enforcement.

### 3. Navigation shell & motion

- **Tab bar** — `expo-blur` translucent floating rounded bar; outline→filled icon swap on active; spring scale-bump on active icon; `selectionAsync` on change. **One shared constant** for tab height + mini-player offset (today drift-prone).
- **Mini-player** — animate in/out (translateY + fade); **2px gold progress hairline** (data exists); tap → shared-element morph to full player.
- **Mini→full morph** — Reanimated `sharedTransitionTag` on the cover (mini cover grows into the 270px artwork).
- **Transitions** — player as bottom-sheet-style modal; consistent platform slide for detail; language + action sheets via `@gorhom/bottom-sheet` (slide + spring + drag-to-dismiss, replacing fade).
- **Splash** — configure native `expo-splash-screen` (`backgroundColor: #0B4634` + logo) so no white flash; JS overlay dismiss gated on `catalog.loading` (cap ~600ms), not a fixed 2s hold.
- **Lists** — vertical lecture/series lists → `FlatList`/`SectionList` with skeletons + `RefreshControl` pull-to-refresh.
- **Accessibility** — labels/roles enforced in `Icon`/`Touchable`.
- **Root** — `GestureHandlerRootView` + `BottomSheetModalProvider` + `ThemeProvider` wired in `app/_layout.tsx`.

### 4. The audio experience

**Player context (`lib/player.tsx`) — extended API:**
`playSeries(episodes, startIndex)`, `next()`, `prev()`, `progressFor(id): number`, functional sleep timer (countdown effect that calls `pause()`), OS now-playing sync on `current` change, `buffering` state. Prefers a local downloaded file URI (§6) when present.

**Now-Playing screen (`app/player.tsx`)**
- **Lock-screen / OS Now Playing** — title / series / generated artwork + transport into the OS media session (Control Center, lock screen, Android notification).
- **Real scrubber** — Gesture-Handler/Reanimated draggable track; floating time-preview bubble follows the thumb; haptic tick on release. Replaces tap-only seek.
- **Working sleep timer** — real countdown → `pause()`; live "Stops in mm:ss" label; long-press → bottom-sheet duration picker.
- **Speed** — tap cycles; long-press → bottom-sheet direct select.
- **Prev/Next** — wired to the queue (starting a series populates the queue); rewind-15/ff-30 retained.
- **Artwork** — 270px `CoverArt` disc with radial lighting + vignette.
- **Transcript** — removed (fake text + panel pulled); clean seam for real transcripts later.
- **Buffering** — real state on the play control.

**Mini-player** — progress hairline, morph transition, queue-aware, persists across tabs.

**Series detail (`app/series/[id].tsx`)** — surface already-tracked state: currently-playing row highlight + `EqBars`; per-episode progress bar for partially-listened; played/unplayed indicator; **"Continue: Ep N · mm left"** chip (vs Play-All always at episode 1). Per-episode + Download-All bound to the offline engine (§6).

### 5. Browse screens

**Home (`app/(tabs)/index.tsx`)** — collapsing hero header → slim translucent-blur sticky bar (logo + search) on scroll; skeletons per rail; pull-to-refresh; retry state; rails on `CoverArt`/`Card`/virtualized lists; continue card uses `progressFor()`; dead "more" icon → real action sheet or removed.

**Library (`app/(tabs)/library.tsx`)** — Series segment as a **year-grouped `SectionList`** (sticky headers); free-text filter collapses behind a search icon; segment chips get counts; skeletons + retry. **Saved (bookmarks)** surfaced here (§7).

**Search (`app/(tabs)/search.tsx`)** — debounced; matched-substring highlighting; unified `EmptyState` for zero-results; recent-search chips + topic grid on the shared card language.

**i18n** — hardcoded English strings (gallery subtitle, downloads copy, some empty states) routed through `t.*`.

### 6. Offline downloads (real engine)

- **`lib/downloads.tsx`** — context tracking per-lecture state `idle | queued | downloading(progress) | downloaded | failed`, persisted to AsyncStorage with a local-file map.
- **Engine** — `expo-file-system` `createDownloadResumable` (audio + cover) with progress callbacks, pause/resume/cancel, resumable recovery after restart, concurrency cap (2) + queue.
- **Playback** — `lib/player.tsx` prefers the local URI when downloaded; falls back to the Supabase URL.
- **Affordances** — download icons on rows/series/player + Download-All bound to real state (tap → progress ring → checkmark; tap → remove). No dead icons.
- **Downloads tab (`app/(tabs)/downloads.tsx`)** — real `FlatList` of downloaded lectures (reusing `LectureListRow` + trailing state), a "downloading now" section, a **real storage-used** footer, per-item + clear-all delete, offline-aware empty state.
- **Offline mode** — downloaded content usable with no network; offline banner + Retry replace "errors as empty."
- **Settings** — Wi-Fi-only toggle real + persisted (gates downloads to Wi-Fi).

### 7. Gallery, Reader & bookmarks

**Gallery** — `expo-image` with blurhash placeholder + fade-in (blurhash stored per photo; width/height already captured); balanced masonry (shorter-column packing by aspect); full-screen lightbox (pinch-zoom + pan + swipe); album header via shared `Header`.

**Reader (`app/reader/[id].tsx`)** — theme-aware paper (sepia in light, warm dark in dark) via tokens + sun/moon toggle; scroll-driven reading-progress hairline; **persisted scroll position** per lecture; font-size bottom-sheet picker.

**Bookmarks** — a persisted saved-lectures store (`lib/bookmarks.ts`, AsyncStorage); the reader bookmark button + a bookmark affordance on lecture rows toggle it; a **Saved** view surfaced in Library. Applies to any lecture (audio/text), not just reader.

### 8. Settings & cross-cutting

**Settings (`app/settings.tsx`)** — persisted real values: Wi-Fi-only (functional), **real storage-used**, content-language reflects selection, **theme toggle** (System/Light/Dark); **Share** (`Share.share()`) + **Contact** (`mailto:`) wired; tappable rows get consistent chevron + press feedback.

**Cross-cutting cleanup**
- **Every dead control killed or wired** app-wide (fake transcript, no-op share/download/bookmark/more, decorative skip buttons).
- Unified `EmptyState` / `Skeleton` / error+Retry everywhere.
- i18n gaps closed; accessibility labels enforced via primitives; consistent padding/radii/cards via tokens.

## Data flow

- **Theme** — `ThemeProvider` (scheme resolution + persistence) → `useTheme()`. Single source; screens are consumers.
- **Catalog** — `catalogProvider` gains an `error` state + `refetch()` (feeds pull-to-refresh + retry). No more swallowed errors.
- **Player** — queue + `progressFor` + sleep timer + OS now-playing all in `PlayerContext`; series detail and mini-player are read-only consumers.
- **Downloads** — `DownloadsProvider` owns state + files; player reads local URI; UI affordances subscribe.
- **Bookmarks** — `BookmarksProvider` (toggle + list); Library Saved view + row/reader affordances subscribe.

## Testing

- **Primary — manual QA checklist** (in the plan): light/dark + system switch; background playback + lock-screen controls; drag-scrub; sleep timer actually pauses; queue prev/next + continue; download → airplane mode → offline playback → delete; Wi-Fi-only gating; gallery blurhash + lightbox; reader dark + progress persist + bookmark; pull-to-refresh; retry on failure; haptics; skeletons; empty states; i18n toggle; accessibility (screen reader labels).
- **Seed unit tests (Jest)** for pure high-risk logic — set up a minimal Jest config for `packages/theme` + pure `apps/mobile/lib` modules and cover: the **downloads-state reducer**, the **sleep-timer countdown**, **theme/token resolution**, and **`progressFor` math**. No component/RN-render tests.
- **CI gate**: typecheck + `expo export` (build) stays green.

## Constraints & non-goals

- Preserve the green/gold brand identity (elevate, don't reinvent).
- No real cover-image sourcing (generated art only; seam left).
- Transcripts removed for now (not deleted from backend; player panel pulled).
- No admin/backend/schema changes required, **except** an additive `photos.blurhash` (nullable) for gallery placeholders — if adding a column is undesirable, fall back to a computed low-res placeholder with no schema change (decide in planning).
- No changes to the admin app.
- Out of scope: word-synced transcript highlighting (no timing data), real cover images, chapters/skip-silence, Arabic UI/RTL (Arabic stays decorative).

## Rollout (internal order; app compiles throughout)

1. Deps + Babel/root wiring (reanimated, gesture-handler, bottom-sheet, expo-image/haptics/blur).
2. Token system (`packages/theme/native.ts`) + `ThemeProvider` + light/dark palettes.
3. Shared `components/ui/*` primitives (incl. `CoverArt`, `Skeleton`, `EmptyState`, `Touchable`, `Header`).
4. Shell: root providers, blur tab bar, splash, status/safe-area, transitions.
5. `catalogProvider` error/refetch; migrate Home/Library/Search onto primitives + skeletons + retry + pull-to-refresh + virtualized lists.
6. Player context extension (queue/progress/sleep/now-playing/buffering) + player screen redesign + mini-player progress/morph + series-detail states.
7. Downloads engine + tab + affordances + offline playback + Wi-Fi gating.
8. Gallery (expo-image/blurhash/lightbox) + Reader (dark/progress/persist/font sheet) + Bookmarks store + Saved view.
9. Settings real values + theme toggle + Share/Contact.
10. Cross-cutting cleanup (kill dead controls, i18n, a11y), Jest seed tests, QA pass.
