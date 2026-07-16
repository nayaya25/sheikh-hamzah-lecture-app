# Design — Althaqalayn Lectures: Monorepo Skeleton + Theme

**Date:** 2026-07-16
**Deliverable 1 of the build order** (per `CLAUDE_CODE_PROMPT.md` §4).
**Status:** Approved.

## Context

Cross-platform Islamic lectures platform for the archive of the late Sheikh Hamzah
Muhammad Lawal (QS) / Althaqalayn Cultural Foundation. One monorepo holds a mobile
app (Expo/React Native) and a login-gated admin console (Next.js), sharing a content
model via workspace packages. Design references are the `.dc.html` prototypes and
`README.md` (high-fidelity design spec).

This spec covers **only the first deliverable**: the monorepo skeleton plus the
`theme` design-token package. No screens are built. Later deliverables (types, api,
i18n, mobile screens, admin screens) each get their own spec → plan cycle.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Monorepo tooling | **pnpm + Turborepo** | Handoff recommendation; pnpm 10.33 already installed. Fast, strict workspace linking + cached task pipeline. |
| Backend | **Supabase** | Postgres fits the relational Program→Series→Episode model; storage/CDN + row-level security + email auth for admin. (Wired in a later deliverable.) |
| Admin framework | **Next.js (App Router)** | Data-heavy dashboard; server integration with Supabase; simple deploy. |
| Scope (this deliverable) | **Skeleton + theme** | Both apps boot blank AND `packages/theme` is ported and consumed. |

Toolchain verified locally: Node v24.15.0, npm 11.12.1, pnpm 10.33.2, git 2.54 (no yarn).

## Target layout

```
althaqalayn/                    (initialized in the current folder)
├─ package.json                 # root: workspace scripts, turbo, devDeps
├─ pnpm-workspace.yaml          # apps/*, packages/*
├─ turbo.json                   # dev / build / lint / typecheck pipeline
├─ tsconfig.base.json           # shared compiler opts + path aliases
├─ .npmrc                       # pnpm: node-linker, public-hoist for RN
├─ .gitignore
├─ apps/
│  ├─ mobile/                   # Expo (RN) — TS, expo-router, boots blank
│  └─ admin/                    # Next.js (App Router) — TS, boots blank
├─ packages/
│  ├─ theme/                    # design tokens (this deliverable)
│  ├─ types/                    # placeholder index.ts (fleshed out later)
│  ├─ api/                      # placeholder index.ts (Supabase, later)
│  └─ i18n/                     # placeholder index.ts (later)
└─ design/                      # .dc.html refs + uploads + prototype jsx (read-only)
```

- Existing `*.dc.html`, `uploads/`, and the `.jsx`/`.js` prototype scaffolding move
  into `design/` to keep the repo root clean. `README.md` and `CLAUDE_CODE_PROMPT.md`
  stay at root as referenceable design spec.
- Packages published internally as `@althaqalayn/theme`, `@althaqalayn/types`,
  `@althaqalayn/api`, `@althaqalayn/i18n`.
- Wiring: pnpm `workspace:*` deps + `tsconfig.base.json` path aliases → both apps
  import shared packages with no separate build step.
- `turbo.json` tasks: `dev` (persistent, uncached), `build`, `lint`, `typecheck`.

## `packages/theme`

Framework-neutral tokens (plain TS objects/constants; no `react-native` or web-only
imports) so both apps consume the same source of truth.

- **`colors`** — all tokens from README §Color: greens
  (`#0B4634` / `#12634E` / `#15705A` / `#17795E` / `#08382A` / `#062A20`), gold
  (`#C79A3B`) & gold-light (`#E4C77B`), creams (`#F6F1E7` / `#FBF8F1`), card white,
  ink (`#17231E`), muted / faint, hairlines, topic-cover gradient pairs
  (morality / society / book / maulud), media-type badge pairs (audio / video / text).
- **`typography`** — families (mobile: Lora, Amiri, Mulish; admin: Sora,
  Instrument Sans, Amiri) + size/weight scale (title 26/600, section 18/600,
  card 14–15/600, body 12.5–13.5, meta 10.5–11.5, overline 9–10/800).
- **`spacing`, `radii`, `shadows`** — from README §Spacing.
- **`gradients`** — helper strings/tuples for header + cover gradients.
- **admin theming** — light + dark CSS-variable token sets
  (`--bg`, `--card`, `--line`, `--ink`, `--muted`, `--faint`, `--input`, `--chip`).

Actual font loading (Google Fonts) is wired per-app in a later deliverable; theme
only names the families.

## Verification (all must pass)

1. `pnpm install` resolves the workspace cleanly.
2. Mobile app boots to a blank screen (Expo — `expo start` / Expo Go).
3. Admin app boots to a blank page (`pnpm --filter admin dev` in browser).
4. `pnpm typecheck` passes across all packages; both apps successfully
   `import { colors } from '@althaqalayn/theme'`.

## Out of scope (later deliverables)

Screens (mobile + admin), `packages/types` content model, `packages/api` Supabase
client + schema + auth, `packages/i18n` EN/HA catalogs, audio/video/downloads,
app icon/splash generation.
