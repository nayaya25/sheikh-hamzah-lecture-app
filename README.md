# Handoff: Althaqalayn Lectures — Mobile App

## Overview
A cross-platform mobile app for the audio/video/text lecture archive of the late **Sheikh Hamzah Muhammad Lawal (QS)** and the **Althaqalayn Cultural Foundation**. Users browse, search, stream, and download lectures. **No user authentication** — all content is public; keep the experience frictionless. A separate, login-protected **admin console** manages what appears in the app.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes that show the intended look and behavior. They are **not** production code to ship directly. The task is to **recreate these designs in a real cross-platform codebase** using that stack's idiomatic patterns and component libraries. Where a detail isn't specified here, match the HTML prototype.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions. Recreate the UI as closely as possible. The `.dc.html` files are Design Components — treat the rendered result (not the DC wrapper syntax) as the source of truth.

## Recommended build stack (for easy Google Play deployment)
- **Framework:** React Native via **Expo** (recommended) or **Flutter**. Either gives one codebase → Android + iOS. Expo is fastest to build and submit to Play; `eas build` + `eas submit` deploys to your Google Play developer account.
- **Audio/background playback:** `react-native-track-player` (RN) or `just_audio` + `audio_service` (Flutter) — both provide lock-screen controls, background audio, and notification transport.
- **Video:** `expo-video` / `react-native-video` (RN) or `video_player` (Flutter).
- **Offline downloads:** `expo-file-system` / `rn-fetch-blob` (RN) or `flutter_downloader` (Flutter); track saved items + resume positions in local storage (`AsyncStorage` / `Hive`).
- **Backend:** a headless CMS + API is enough. Options: **Supabase** or **Firebase** (DB + storage + CDN + simple admin) or **Strapi/Directus** (self-hosted CMS with a ready admin UI). Media served from object storage behind a CDN.

## Design Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| Primary green (deep) | `#0B4634` | headers, primary buttons, active nav |
| Primary green (mid) | `#12634E` | gradients, links |
| Green highlight | `#15705A` / `#17795E` | gradient ends |
| Green deepest | `#08382A` / `#062A20` | player base, ornamental bg |
| Gold | `#C79A3B` | accents, section arabic labels |
| Gold light | `#E4C77B` | on-dark accent, play button, progress |
| Cream (app bg) | `#F6F1E7` | main background |
| Cream (surface alt) | `#FBF8F1` | minimal surfaces |
| Card white | `#FFFFFF` | cards |
| Ink | `#17231E` | primary text |
| Muted | `#6A766E` / `#8B978F` | secondary text |
| Faint | `#9AA69E` / `#AAB4AC` | tertiary text |
| Hairline | `#ECE4D3` / `#E7DFCE` | borders/dividers |
| Topic — morality | `#4A2F5E` → `#7A4F9C` | cover gradient |
| Topic — society | `#5E3A2F` → `#A06A4A` | cover gradient |
| Book series | `#173A4F` → `#2C7396` | cover gradient |
| Maulud | `#7A5A12` → `#C0932F` | cover gradient |

Media-type badges: Audio `#EAF3EF`/`#12634E`, Video `#F6ECEC`/`#a23e3e`, Text `#F1EEF6`/`#6a4f9c`.

### Typography
- **Lora** (serif) — headings, lecture/series titles. Weights 400/500/600.
- **Amiri** (serif) — Arabic script (section labels, calligraphic motifs, ﷽/ﷲ).
- **Mulish** (sans) — all UI text, labels, body. Weights 400–800.
- Scale: screen title 26px/600 · section header 18px/600 · card title 14–15px/600 · body 12.5–13.5px · meta 10.5–11.5px · overline 9–10px/800 letter-spacing 0.8–1px.

### Spacing / radius / shadow
- Screen padding 16–20px. Card padding 12–18px. Gaps 8–14px.
- Radius: cards/covers 14–20px, phone frame 38–46px, pills/chips 18–22px, small tiles 10–16px.
- Card shadow: `0 6–14px 18–34px rgba(11,70,52,0.06–0.16)`.
- Status bar text: white on green/detail/player screens, ink (`#17231E`) elsewhere.

## Screens / Views

### 1. Home — "calm library"
- **Green header** (`linear-gradient(158deg,#0B4634,#12634E,#15705A)`, rounded bottom 30px, dotted-radial texture overlay, faint Amiri watermark). Greeting `السلام عليكم` (gold), app title "Althaqalayn Lectures" (Lora 23/600 white), subtitle "Sheikh Hamzah Muhammad Lawal · Archive". Circular gold-outline badge (Arabic ح). Translucent search bar with "EN" language pill → taps to Search.
- **Continue listening** card overlapping header bottom (-26px), white, cover + "CONTINUE LISTENING" overline + title + progress bar + minutes left + play. → opens Player.
- **Explore** 3-col grid of category tiles: Arabic motif + English label + count. → Series/Library.
- **Featured series** horizontal scroll: 178px cards, gradient cover with big faint Arabic + kind chip, title + meta. → Series detail.
- **Latest lectures** vertical list: 60px gradient cover w/ play glyph, type badge + date, title, series·part, overflow dots. → Player.
- Persistent bottom nav + mini-player.

### 2. Library
- Title "Library" + Arabic `المكتبة`. Segmented pills: **Recent · Occasions · Topics · Series** (active = filled green).
- Recent → lecture rows. Occasions/Topics/Series → series rows (70px cover, kind, title, "N parts · media · year", chevron).

### 3. Search
- White search field (live text input) + clear (×). Filter chips **All / Audio / Video / Text** (active = filled green).
- Empty state: "Recent searches" chips (with clock icon) + "Browse topics" 2-col gradient tiles.
- Query state: result count + lecture rows.

### 4. Downloads
- Title + Arabic `التنزيلات`. Green storage card: "1.4 GB of 4 GB used" + gold progress bar. List of saved lectures with size meta + filled check.

### 5. Series detail
- Colored hero (series gradient) with back button, faint Arabic, kind chip (nowrap), title (Lora 25/600), meta (count · media · lang · year), description, **Play all** (white) + **Download all** (translucent).
- "All N parts · Newest first" + episode rows: number chip, title, type badge + duration, download icon. Tafsīr uses "Night N · Juz N".

### 6. Player (full-screen) + mini-player
- Full-bleed gradient from the current series colors → `#0a3b2c`. Top bar: minimize chevron, "NOW PLAYING" + series, share.
- 270px circular artwork: rotating gold ring (spins only while playing), rounded-square gradient tile with big Amiri Arabic + type label + dotted texture.
- Title (Lora 22/600) + series·part (gold). Scrubber (gold fill + white knob, tap-to-seek) + current/total time.
- Transport: prev · back-15 · big gold play/pause (74px) · fwd-30 · next.
- Secondary row: **Speed** (cycles 1 → 1.25 → 1.5 → 2 → 0.75×), **Sleep** (0/15/30/45m), **Download**, **Transcript** (toggles Hausa transcript panel).
- **Mini-player:** green bar above nav, cover with animated EQ bars (animate only while playing), title + series (gold), play/pause. Tap to expand.

### Bottom navigation (persistent, hidden on full Player)
Home · Library · Search · Downloads. Active = `#0B4634` + bold label; inactive `#9AA89F`. Icons use `currentColor`.

## Interactions & Behavior
- Tab switch resets any open detail. Series card/category → detail. Lecture/episode → Player (full) + sets current.
- Player: play/pause toggles rotating ring + EQ bars; back/fwd nudge position ±5%; seek by tap; speed/sleep cycle through fixed sets; transcript slides in.
- Minimize keeps playback in mini-player. Share/Download-all show a transient toast ("Coming soon in this prototype" — wire to real actions).
- Transitions: `fadeup`/`rise` 0.28–0.4s ease on screen/card entry; ring `spin 8s linear infinite`; EQ `eq 0.9s ease-in-out infinite`.
- **Persist to local storage:** last position per lecture (resume), downloaded list, chosen language, playback speed.

## State Management
- `activeTab`, `openSeriesId`, `currentLecture`, `playerExpanded`, `isPlaying`, `position`, `speed`, `sleepTimer`, `transcriptOpen`, `searchQuery`, `mediaFilter` (search), `libraryFilter` (library media type), `librarySegment`, `language` (`en`|`ha`), `languageSheetOpen`, `settingsOpen`, `readerOpen`, `readerFontScale`, `autoDownloadWifi`, `splashVisible`.
- Data fetching: catalog, series (+ordered episodes), search — all read-only from the public Content API. Downloads + resume positions are local.

## Content model (for the backend/admin)
- **Lecture:** title (EN + Hausa), type (audio|video|text), duration, date, description, media URL, transcript, language, seriesId, order.
- **Series:** title, kind (`recency`-surfaced | `occasion` | `topic` | `book`), year/occasion, language, cover colors, description, ordered lectures, `featured` flag.
- **Admin console (login-protected web):** upload lecture + metadata; create/order series; assign kind/topic/year; publish/unpublish + schedule (nightly Tafsīr); feature on Home; manage Explore categories; edit transcripts/translations.
- Language: English-first UI with Hausa toggle; content mostly Hausa, some English — tag each item.

### 7. Splash screen (launch)
- Full-frame deep-green radial gradient (`#12634E`→`#0B4634`→`#072d22`) with dotted texture + faint Amiri ﷲ watermark.
- Centered: the **Foundation logo** on a soft cream rounded plate (`#F7F2E8`, radius 28, gold hairline border, soft shadow) — the logo's dark-green/gold artwork needs a light backing to read on the green.
- Bottom: three gold pulsing dots (`blink` 1.2s, staggered .2s) + tagline "Preserving the lectures of Sheikh Hamzah Muhammad Lawal (QS)".
- Auto-dismisses after ~2.5s (fade opacity→0 + slight scale-up over .6s); tappable to skip. Native: show at cold start only, dismiss when the catalog first loads.

### 8. Settings
- Green header (back chevron, `الإعدادات` / "Settings"). Profile card: emblem avatar on a green circle + "Sheikh Hamzah Muhammad Lawal (QS)" + Foundation.
- **Preferences:** App language (opens language sheet, shows current), Content language (Both, informational), Download over Wi-Fi only (toggle switch — track `#0B4634` on / `#d5cdb8` off, 44×26, knob 20px).
- **Playback:** Default playback speed (cycles, shows `1×`…), Manage downloads (shows total).
- **About:** description, Share the app / Contact buttons, version line.

### 9. Language switch (bottom sheet)
- Scrim (`rgba(20,30,26,.45)`) + bottom sheet (radius 24 top, grab handle). Title "App language" / `اللغة`, note that lectures play in their original language.
- Two selectable rows — **English** / **Hausa** (with native names) — selected row: `#0B4634` border + `#EAF3EF` fill + filled green check; unselected: `#E4DCC9` border + empty ring. Green "Done" / "An gama" button.
- Switching flips ALL UI copy (search placeholder, labels, reader body) via a language map; the header pill shows `EN`/`HA`. Opened from the header pill and Settings.

### 10. Text reader (for `type: text` lectures)
- Text lectures open THIS, not the audio player. Warm paper (`#F4ECD8` + dotted texture). Sticky top bar: back, "READING · {language}", A− / A+ font-size, bookmark.
- Centered column (max ~340px): Bismillah, Lora title, series·part meta, ✦ divider, body paragraphs with a gold drop-cap on the first. Body font-size scales with A−/A+ (`fontScale` 0.8–1.5, ±0.12 step). Body copy is localized (EN/HA).

### Library media-type filter
- On the Library **Recent** segment, below the segment pills: chips **All / Audio / Video / Text**, each with a colored dot (All `#0B4634`, Audio `#12634E`, Video `#a23e3e`, Text `#6a4f9c`). Active = filled green. Filters the lecture list by `type`. (Search already has the same filter row.)

## Admin console (login-protected web app — desktop)
Separate from the mobile app: a responsive web dashboard for Foundation staff. Same brand palette; deep-green sidebar, gold accents. **Modern type: Sora (headings) + Instrument Sans (UI)**, Amiri for Arabic. **Light + dark mode** via a topbar toggle — surfaces are driven by CSS variables (`--bg`, `--card`, `--line`, `--ink`, `--muted`, `--faint`, `--input`, `--chip`); light and dark token sets are in the `<style>` block, applied by an `.ac-root`/`.dark` wrapper class. The sidebar stays deep-green in both modes. Design width ~1320px (build responsive down to tablet). Prototype: `Admin Console.dc.html`.

### A. Login
- Split screen: left green panel (emblem + "Althaqalayn Lecture Archive" + description, dotted texture, faint ﷲ); right white column with Email + Password fields and a green "Sign in to console" button. Real auth required here (unlike the public app).

### B. Shell
- **Sidebar (246px, green gradient):** emblem + "Althaqalayn / ADMIN CONSOLE"; nav groups MANAGE (Dashboard, Lectures, Series & collections, Categories, Media library, Featured & Home, Transcripts) and SYSTEM (Settings); footer admin chip + logout. Active item: gold text + `rgba(228,199,123,.14)` fill + gold left-bar.
- **Top bar:** page title, global search, primary **"+ New lecture"** button (opens editor drawer).

### C. Dashboard
- Four stat cards (Total lectures, Series, Storage used, Total plays) with colored status dot + delta line.
- **Recent uploads** list (cover, title, series·part, status pill) + **Scheduled** green panel (auto-publishing queue, e.g. nightly Ramadan Tafsīr with publish times).

### D. Lectures
- Status filter chips (All / Published / Draft / Scheduled). Table: TITLE (cover + series·part), TYPE badge, LANGUAGE, LENGTH, DATE, STATUS pill, ⋯ actions. Row click → editor drawer in edit mode.
- Status pills: Published `#EAF3EF`/`#12634E`, Draft `#EFEFEA`/`#8b8b7e`, Scheduled `#FBF1DA`/`#9a7420`.

### E. Series & collections
- Card grid: gradient cover + Arabic + kind chip, title, meta (parts · media · year), status pill, Edit. Click → series editor.

### F. Categories
- Rows for each Explore category (Arabic motif + label + count) with an on/off toggle controlling whether it shows on the app home.

### G. Media library
- Storage summary (used / total + per-type breakdown). File table: name, TYPE badge (audio/video/text/image), size, used-in, upload date, actions.

### H. Featured & Home
- Two panels: **Featured series** (per-series on/off toggles, drag-to-order) and **Home sections** (toggle Continue listening / Explore / Featured / Latest / Events & photos). Plus a **Daily highlight** picker. These directly drive what the app home renders.

### I. Transcripts
- Summary counts (Complete / Auto-needs-review / Missing). Per-lecture table with language, status pill, and a Review/Generate action.

### J. Settings
- Foundation profile (emblem, contact email, website), Admin accounts list with roles (+ Add), Data & backup (nightly-backup toggle, export catalog CSV, download backup).

### K. Lecture editor (right drawer, ~472px, slides in)
- File dropzone (audio/video/text, up to 2 GB). Fields: Title EN, Title Hausa, Series (select), Part, Media type, Language, Description, Transcript. **Publish immediately** toggle — when OFF, reveals a **Schedule for** datetime field (this is how nightly Tafsīr is queued). Footer: Cancel / Publish (label becomes "Save draft" when unpublished). Save writes via the admin API, then the public Content API serves it.

## Assets
- **Foundation logo** — real artwork, bundled: `uploads/althaqalayn_logo_primary.svg` (full lockup: emblem + Arabic wordmark + "ALTHAQALAYN / CULTURAL FOUNDATION", dark-green `#0E4D3A` + gold `#C4A24C`/`#B08D3C`/`#B99340`; designed for a LIGHT background). `uploads/althaqalayn_emblem.svg` (emblem only — gold ring + 8-point star; works on any background). Splash uses the full lockup on a cream plate; the Home header badge and Settings avatar use the emblem.
- **No photographic assets.** All "covers" are CSS gradients + Amiri Arabic type + geometric/dotted CSS textures. Other icons are inline SVG (stroke, `currentColor`). Reproduce with the codebase's icon library (or keep the SVGs).
- Fonts: Lora, Amiri, Mulish, Cormorant Garamond (1c only) — Google Fonts.

## Files
- `Althaqalayn Lectures.dc.html` — **the approved design.** Full interactive mobile prototype (all mobile screens above).
- `Admin Console.dc.html` — **the admin dashboard prototype** (login, shell, dashboard, lectures, series, categories, editor drawer).
- `App Map.dc.html` — architecture map: user app flow, content model, admin/backend, deployment.
- `Alternatives.dc.html` — three alternate Home visual directions (not selected; kept for reference / element blending).
- `uploads/althaqalayn_logo_primary.svg`, `uploads/althaqalayn_emblem.svg` — Foundation artwork used across both apps.
- `image-slot.js`, `browser-window.jsx`, `android-frame.jsx` — prototype scaffolding components (device/window chrome, image drop slots); reference only.

## Update — search, category management & top bar

- **Search everywhere:** every list is text-filterable. App: Library (filters the active segment, alongside media chips), Downloads, and series-detail episodes. Admin: the top-bar search filters whichever view is open (lectures, media, transcripts, programs, categories).
- **Categories are fully managed** (admin → Categories): add, edit (name + Arabic label modal), enable/disable toggle, archive → Archived section with restore/delete. Category = `{ id, label, ar, meta, active, archived }`.
- **Transcripts** Review/Generate opens a real transcript editor drawer (text area + status + save) — no dead actions.
- **Contextual top-bar action:** the primary button changes per admin view (New lecture / New series / New category / New album / Upload media) and is hidden on views with no create action (Featured, Transcripts, Settings) — it is no longer a persistent "New lecture".

## Update — lecture types, years & Gallery

### Content model change (supersedes the earlier Lecture/Series notes)
- **Lecture** gains **`scope`** = `series` | `single`, and **`year`** (e.g. "1445 AH · 2024").
  - `series` lectures belong to a **program/collection** (Ramadan Tafsīr, Maulud, Ethics of the Self, Nahj al-Balāgha, Society & Justice) and carry an **episode/part number**.
  - `single` lectures stand alone; program is optional, no episode number.
- **Program/collection** is the parent grouping. A program (e.g. *Ramadan Tafsīr*) spans **multiple years**; **each year is its own series of ~20–30 episodes** (Tafsīr 1445, Tafsīr 1446…). So: Program → per-year Series → Episodes.
- Admin editor reflects this: **Lecture type** (Series/Single segmented control), **Year** field, **Program/Collection** select, and **Episode** number shown only when type = Series. Sidebar section renamed **"Programs & series"**.

### Gallery (photos of events) — app + admin
- **App:** a **"Events & photos"** row on Home → **Gallery** screen (album list: event cover, title, date, photo count) → **Album** screen (masonry photo grid; green header with event name/date/count, back to list). Green headers → white status bar. Albums/photos are admin-managed content served read-only to the app.
- **Admin (`Gallery & events`):** album card grid + **New album**; each album card is a **drop target for photos** (`<image-slot>` in the prototype) with a photo count and Manage action. Data: album = { title, date, event, cover, photos[], published }.
- Add a `galleries/albums` collection to the backend + Content API; photos are images in media storage/CDN.
