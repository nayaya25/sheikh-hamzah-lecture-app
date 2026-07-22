# Mobile Redesign — Implementation Plan

> Visual source of truth: `docs/superpowers/prototypes/mobile-modern.html` (open it —
> Home hero, Continue card, Featured spotlight, Browse grid, cover cards, Collection
> screen, Player, curved bottom nav). It's HTML; **translate the presentation to React
> Native** (StyleSheet / RN primitives / expo — NOT html/css). Our content, their look.

**Goal:** Apply the premium Islamic-app presentation to the Expo app — richer Home,
cover-art library, elevated collection + player, curved gold-accent tab bar — WITHOUT
changing features, data, navigation routes, or the audio/offline/bookmark logic.

**Architecture:** Expo Router (SDK 57), existing `ThemeProvider`/`useTheme`
(`lib/theme.tsx` + `packages/theme` native tokens), catalog in `lib/catalog.ts` +
`catalogProvider.tsx`, player in `lib/player.tsx`, downloads/bookmarks libs. Green/gold
identity, fonts Lora/Amiri/Mulish (keep). Restyle screens + add presentation components;
reuse all data/logic hooks.

## Global constraints
- React Native only (no web/DOM). Use existing `components/ui/*` (AppText, Button, Card,
  Chip, CoverArt, Icon, Touchable), `GradientCover`, theme tokens, and add new
  presentation components. Keep dark + light (theme-driven).
- Do NOT change: routes/params, `playCollection`/queue, downloads/bookmarks/lock-screen/
  sleep-timer logic, catalog API, `@althaqalayn/*`. Presentation only.
- Preserve accessibility (labels), the un-nested download-button row fix, progress/played
  state, and i18n (en/ha) — reuse existing message keys; add keys only if unavoidable (both langs).
- Each task ends with `pnpm --filter mobile typecheck` green; jest stays green; M6 is the gate.

## Tasks (branch: feat/admin-redesign — apps/mobile is disjoint from apps/admin)

### M1 — Shared presentation primitives + Home
- Create components: `MosqueSilhouette.tsx` (inline `react-native-svg` skyline), a subtle
  pattern/`HeroBackground`, `HomeHero` (greeting + foundation line + crescent + verse over a
  green gradient — reuse `expo-linear-gradient`), `ContinueCard` (resume last lecture w/
  progress), `SpotlightCard` (featured "lecture of the day"), `BrowseGrid` (Occasions/Series/
  Topics/Gallery icon tiles), and a reusable `CollectionCard` (cover-art card — used by Library too).
- Rebuild `app/(tabs)/index.tsx` (Home) to the prototype: hero → continue → featured spotlight →
  browse grid → latest lectures list. Source from catalog (`featuredCollections`, `latestLectures`)
  + continue/progress (existing). Tap wiring unchanged (open lecture/collection/player).
- Gate: mobile typecheck. Commit `feat(mobile): premium Home (hero, continue, spotlight, browse, latest) + shared cards`.

### M2 — Library
- Rebuild `app/(tabs)/library.tsx`: kind segments (Occasions/Series/Topics/Saved) + `CollectionCard`
  grid (2-col cover cards). Reuse M1's `CollectionCard`.
- Gate: typecheck. Commit.

### M3 — Collection screen
- Rebuild `app/collection/[id].tsx`: cover hero (gradient + Arabic + back + kind + count + Play all),
  grouped-by-label (occasion/topic) / flat-by-sort (series) sittings with premium rows (number,
  type icon, title, meta, download button as sibling not nested, played/now-playing state).
  Reuse `groupLectures`, `playCollection`, `DownloadButton`.
- Gate: typecheck. Commit.

### M4 — Player + MiniPlayer
- Rebuild `app/player.tsx`: large artwork, `Scrubber` (existing) with gold handle, transport
  (prev/play/next), action row (download/save/sleep/speed) — all wired to existing player controls.
  Restyle `MiniPlayer.tsx` to match. No logic change to `lib/player.tsx`.
- Gate: typecheck. Commit.

### M5 — Curved tab bar
- Rebuild `app/(tabs)/_layout.tsx` tab bar: curved/elevated bar, gold active indicator, the app's
  real tabs (Home/Library/Downloads/Settings or current set — keep the existing routes). Keep MiniPlayer
  docking above it. Player screen hides the bar (already or add).
- Gate: typecheck. Commit.

### M6 — Green gate + review
- `pnpm --filter mobile typecheck && pnpm --filter mobile test` green. Design-review vs prototype +
  make-interfaces-feel-better (RN adaptation). Fix findings.

## Sequencing
M1 first (creates shared `CollectionCard`/hero pieces). M2/M3/M4/M5 mostly disjoint screen files —
run after M1 (M2 reuses M1's card). M6 last.
