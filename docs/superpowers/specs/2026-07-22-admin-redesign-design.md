# Admin Console Redesign — Design Language

**Date:** 2026-07-22
**Scope:** `apps/admin` — total UI/UX overhaul (no data-model or API changes)
**Status:** Direction approved (Editorial Scholarly Luxury · keep green/gold + Amiri · foundations-first)

## Problem

The admin works but reads as templated/AI-generated. Root causes (not the palette or fonts):
- **No craft layer.** Hairline `1px` gray borders everywhere; no shadow system, no radius scale, no spacing scale, no motion tokens. Everything sits flat on cream with no elevation hierarchy.
- **Templated tells.** All-caps 11px/800 micro-labels on every field; 1.5px solid input borders; flat solid-fill buttons with no depth/press feedback.
- **Login IA.** Left green panel is `flex:1`, right form is a fixed `460px` → a narrow form strip on wide screens (the reported 50/50 complaint).
- **Flat rhythm.** Uniform 26px padding, uniform cards, repeated uppercase labels — no spatial hierarchy or focal moments.

The identity (deep green + gold + Amiri + warm parchment) is a genuine strength for a revered scholar's archive and is **kept**. We rebuild the craft/primitive layer and layout rhythm on top of it.

## Direction: Editorial Scholarly Luxury

A quiet, reverent, editorial register — warm parchment surfaces, a serif display voice (Amiri) reserved for one focal moment per screen, generous spatial rhythm, gold hairlines, and soft layered shadows instead of hard borders. It should feel like the digital counterpart of a well-made scholarly volume, not a SaaS dashboard.

Guardrails: green is the accent; gold is the secondary/detail accent; semantic colors (success/warning/critical) are separate from both. Spend boldness on the login hero and the dashboard greeting; keep working views calm, dense, and scannable.

## Token system (the foundation)

All tokens live as CSS custom properties in `globals.css` (both themes) with typed mirrors in `lib/tokens.ts` for inline-style components. Components consume tokens — never raw hex except brand constants.

### Color — light ("day")
| Token | Value | Role |
|---|---|---|
| `--paper` | `#F6F1E6` | app ground (warm, green-biased parchment) |
| `--paper-2` | `#EFE8D8` | recessed ground (rails, wells) |
| `--card` | `#FFFDF9` | primary surface (warm white, not cold `#fff`) |
| `--card-raised` | `#FFFFFF` | top elevation (popovers, active) |
| `--ink` | `#15221D` | primary text (deep green-black) |
| `--muted` | `#5E6A62` | secondary text |
| `--faint` | `#97A199` | tertiary text / placeholders |
| `--line` | `#E6DCC7` | warm hairline |
| `--line-strong` | `#D8CBB0` | stronger divider |
| `--field` | `#FBF7EE` | input well |
| `--chip` | `#E9F1EC` | green-tint chip bg |

### Color — dark ("night")
`--paper` `#0E1512` · `--paper-2` `#0A0F0D` · `--card` `#16201B` · `--card-raised` `#1B2620` · `--ink` `#F1ECDD` · `--muted` `#9AA69E` · `--faint` `#6A766E` · `--line` `#243029` · `--line-strong` `#2E3B33` · `--field` `#1B2620` · `--chip` `#17332A`.

### Brand constants (both themes)
green `#0B4634` · greenMid `#12634E` · greenDeepest `#08382A` · greenBright `#17795E` · gold `#C79A3B` (on light) · goldSoft `#E4C77B` (on dark/green) · goldWash `#FBF1DA`.

### Radii (concentric discipline: inner = outer − padding)
`--r-xs` 8 · `--r-sm` 10 · `--r-md` 14 · `--r-lg` 18 · `--r-xl` 24 · `--r-pill` 999.

### Spacing (4px base)
4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 72.

### Elevation (layered shadows over borders)
- `--sh-1` rest card: `0 1px 2px rgba(20,35,25,.05), 0 1px 1px rgba(20,35,25,.03)`
- `--sh-2` hover/float: `0 2px 6px rgba(20,35,25,.06), 0 8px 20px rgba(20,35,25,.06)`
- `--sh-3` popover/modal: `0 12px 32px rgba(20,35,25,.12), 0 3px 8px rgba(20,35,25,.06)`
- light cards add inset top highlight `inset 0 1px 0 rgba(255,255,255,.7)`; dark uses `rgba(255,255,255,.04)` and shadow alphas ≈ .4.

### Motion
- `--ease-out` `cubic-bezier(0.32,0.72,0,1)` (primary) · `--ease-standard` `cubic-bezier(0.65,0,0.35,1)`
- durations: fast 140ms · base 220ms · slow 380ms
- press: `scale(0.97)`; hover-lift: `translateY(-1px)` + shadow step. Respect `prefers-reduced-motion`.

### Typography (three existing faces, three roles)
- **Amiri (serif) — the voice.** Login brand title, dashboard greeting, large Arabic. One display moment per screen. `text-wrap: balance`.
- **Sora (sans) — structure.** View titles, card titles, nav, stat numbers. Tight tracking (−0.01 to −0.02em) at ≥20px.
- **Instrument Sans — body/UI/data.** Body, labels, buttons, table data.
- Scale: 11 (micro) · 12.5 (caption) · 14 (body) · 15 (body-lg) · 17 (subtitle) · 20 (h3) · 26 (h2) · 34 (h1) · 44+ (serif display).
- **Eyebrows used sparingly:** 11px uppercase, letter-spacing .16em, muted + gold tick. Field labels become **sentence-case** (`Email`, not `EMAIL`) at 12.5px muted — this removes the biggest templated tell.
- `font-variant-numeric: tabular-nums` on all stats, counts, dates, durations.

## Component language
- **Card:** `--card` surface, `--r-lg`, `--sh-1` at rest → `--sh-2` + `translateY(-1px)` on hover (interactive cards only), inset top highlight, hairline only where separation is genuinely needed. Inner controls use concentric smaller radii.
- **Button (primary):** green fill, gold-tinted inset highlight, `--r-sm`, `scale(0.97)` press, hover → greenMid, gold focus ring. CTAs use the **button-in-button** trailing icon (nested circle flush to the right padding).
- **Button (secondary/ghost):** transparent/`--field`, hairline, ink text, same press/hover physics.
- **Input/field:** `--field` well, `--line` hairline, `--r-sm`, 15px text (≥16 on mobile to stop iOS zoom); focus → green ring + border. No 1.5px gray borders. Sentence-case label above.
- **Nav item:** soft pill; active = gold text on `goldWash`/`rgba(gold,.14)` fill with a gold leading tick — elevated past the current left-border bar.
- **Status pill / media badge:** keep semantic colors; soften to `--r-pill` chips, 10.5px, tabular where numeric.
- **Focus-visible:** 2px gold ring at 2px offset on every interactive element.

## Screens in this foundation build
1. **Login (50/50):** CSS grid `1fr 1fr`, `min-height: 100dvh`. Left brand panel (green gradient + refined dot texture + large Amiri `ﷲ` watermark + emblem + Amiri title + a gold hairline rule + scholarly subline). Right: a centered sign-in block (max-width ~380 inside its half), elevated inputs, premium primary button, sentence-case labels, clear error + busy states. Below 820px: stack to a single column (panel becomes a compact header band, form below).
2. **Shell (Sidebar / Topbar / Console):** sidebar keeps the green gradient but gains depth (inset highlight, subtle texture), pill nav with gold active state, brand row set in Amiri + Sora. Topbar: taller breathing room, refined search well, theme toggle + contextual primary as button-in-button. Console: paper ground, content max-width rhythm, section spacing from the scale.
3. **Dashboard (exemplar view):** an Amiri greeting eyebrow + serif line; stat cards with tabular numbers, a subtle sparkline/endpoint treatment where a trend exists, and semantic dots; "Recent uploads" list with concentric thumbs; the scheduled card refined (depth, gold detail). This is the reference other views copy.

## After approval (not in this build)
Roll the language across: Content Workspace (tree + detail + editors + bulk-add), Featured, Gallery, MediaLibrary, Transcripts, Settings, and all `components/fields/*` + `SectionedForm`/`ConfirmProvider`/`ActionMenu`. Then a design review pass.

## Constraints & non-goals
- **No data-model / API / routing changes** — visual + interaction only.
- Keep the inline-style + CSS-var architecture (no Tailwind/shadcn migration); add a typed `lib/tokens.ts` layer.
- Keep the three existing fonts; introduce no new typeface.
- Both themes get equal care; nothing relies on color alone (icons/labels back status).
- WCAG AA contrast, 40×40 min hit areas, visible focus, keyboard paths preserved.
- Out of scope: mobile app, Arabic-RTL admin UI, new features.
