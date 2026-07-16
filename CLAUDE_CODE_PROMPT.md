# Working this handoff in Claude Code — Monorepo

Everything (mobile app + admin console + shared code) lives in **one repo**. This
file tells you how to drive Claude Code through it. `README.md` is the design
spec; the two `.dc.html` files are the interactive visual references.

---

## 1. Open the folder and start Claude Code

```bash
unzip design_handoff_althaqalayn_app.zip
cd design_handoff_althaqalayn_app
claude
```

## 2. Target monorepo layout

Ask Claude Code to scaffold this structure. It uses **pnpm workspaces + Turborepo**
(swap for npm/yarn workspaces if you prefer — just say so).

```
althaqalayn/
├─ package.json            # workspace root, turbo pipeline
├─ pnpm-workspace.yaml
├─ turbo.json
├─ apps/
│  ├─ mobile/              # Expo (React Native) — the lectures app
│  └─ admin/               # Next.js (or Vite) — the admin console
├─ packages/
│  ├─ theme/               # colors, fonts, spacing tokens (from README)
│  ├─ types/               # shared TS types: Lecture, Program, Category…
│  ├─ api/                 # backend client (Supabase/Firebase) + data hooks
│  └─ i18n/                # EN + HA translation catalogs
└─ design/                 # the .dc.html references (read-only)
```

Why shared packages: the mobile app and admin console describe the **same content
model** (lectures, series, programs, categories, gallery, transcripts). Keeping
`types`, `api`, and `theme` in `packages/` means one source of truth for both.

## 3. Kickoff prompt — paste this into Claude Code first

> Read `README.md` and `CLAUDE_CODE_PROMPT.md`. This is a monorepo for a
> cross-platform Islamic lectures platform: a mobile app (Expo/React Native) and
> an admin console (Next.js). The two `.dc.html` files in `design/` are the
> interactive design references — open them in a browser to match layout, colors,
> spacing, and fonts.
>
> Step 1: scaffold the pnpm + Turborepo monorepo exactly as laid out in
> `CLAUDE_CODE_PROMPT.md` (apps/mobile, apps/admin, packages/theme, types, api,
> i18n). Wire the workspaces, turbo pipeline, and TypeScript project references so
> both apps can import the shared packages. Don't build screens yet — just get the
> skeleton installing and both apps booting to a blank screen.

## 4. Build order (verify each step before moving on)

1. **Monorepo skeleton** — workspaces install, `apps/mobile` boots in Expo Go,
   `apps/admin` boots in the browser.
2. **`packages/theme`** — port the colors, fonts (Sora/Instrument Sans/Amiri),
   spacing, and radii from `README.md`. Both apps consume it.
3. **`packages/types`** — Lecture, Series, Program, Category, GalleryItem,
   Transcript, User. This is your content model.
4. **`packages/api`** — pick the backend (Supabase or Firebase — both fit).
   Define schema/tables for the types above, plus auth for the admin.
5. **`packages/i18n`** — EN + HA catalogs; RTL-safe; Amiri for Arabic text.
6. **Mobile app** (`apps/mobile`), screen by screen against
   `Althaqalayn Lectures.dc.html`: nav shell → Home → Library (search + media
   chips) → Series → Player (background audio + lock-screen controls) → Video →
   Downloads (offline via expo-file-system) → Text reader → Settings + language
   switch → Splash.
7. **Admin console** (`apps/admin`), against `Admin Console.dc.html`: login →
   dashboard → lecture editor (series/single, year dropdown, program) → media
   library → featured/home → programs CRUD → gallery → categories → users.

## 5. Platform notes to state explicitly

- **Audio**: background playback + lock-screen controls → `expo-av` +
  `expo-notifications`, or `react-native-track-player` (bare workflow).
- **Downloads**: `expo-file-system` + a local index (SQLite or AsyncStorage).
- **i18n**: `i18n-js` or `react-intl`; keep Amiri for Qur'anic/Arabic text.
- **Shared API layer**: mobile reads published content; admin does full CRUD +
  auth. Same `packages/api` client, different permissions.
- **App icon / splash**: use the emblem SVG in `uploads/` as the source.

## 6. Working tips

- Commit after each working screen or package.
- When a screen looks off, tell Claude Code to open the matching `.dc.html` in
  `design/` and compare.
- Build the mobile app first; the admin console can follow once the content model
  and backend are settled.
- Run `turbo run dev` to bring up both apps; `turbo run build` to build all.
