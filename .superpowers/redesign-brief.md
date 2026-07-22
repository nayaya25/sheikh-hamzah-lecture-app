# Admin Redesign — Shared Component Brief (Editorial Scholarly Luxury)

Apply this design language to admin views. **Restyle only — never change logic,
props, data flow, state, or behavior.** Keep every className hook, every handler,
every conditional. If a file's logic looks buggy, leave it; this is a visual pass.

## Where the vocabulary lives
- Tokens (import): `import { radii, motion, shadow, space, lift } from "@/lib/tokens"`
  and `import { brand, font } from "@/lib/ui"`.
- Theme-aware surfaces via CSS vars ONLY (never hardcode surface/ink/line hex):
  `var(--paper)` app ground · `var(--paper-2)` recessed · `var(--card)` surface ·
  `var(--card-raised)` top · `var(--ink)`/`var(--muted)`/`var(--faint)` text ·
  `var(--line)`/`var(--line-strong)` · `var(--field)` input well · `var(--chip)`.
- Brand constants (fixed both themes): `brand.green #0B4634`, `greenMid`, `greenDeepest`,
  `greenBright #17795E`, `gold #E4C77B` (on dark/green), `goldDk #C79A3B` (on light text),
  `goldWash`. Semantic (separate from accent): success uses green family; warning `#9a7420`
  on `#FBF1DA`; critical `#a23e3e` on `rgba(162,62,62,.08)`; keep `statusPill()`/`mediaBadge()`.
- Fonts: `font.heading` (Sora — titles/nav/numbers, tight tracking ≥20px), `font.ui`
  (Instrument — body/labels/buttons), `font.arabic` (Amiri — ONE serif display moment
  per screen + Arabic marks).

## Reference implementations (read these — copy their patterns exactly)
`components/Login.tsx`, `components/Sidebar.tsx`, `components/Topbar.tsx`,
`components/views/Dashboard.tsx`, `lib/tokens.ts`, `app/globals.css`.

## Recipes

### Card
`background: var(--card)`, `borderRadius: radii.lg` (18), `padding: 20–22`,
`boxShadow: "var(--sh-1), var(--highlight)"`, **no border** (drop `1px solid var(--line)`;
use a hairline only for genuine internal dividers). Interactive/clickable card: add
`transition: transform motion.base motion.out, box-shadow motion.base motion.out` and on
hover `transform: translateY(-2px)` + `boxShadow: "var(--sh-2), var(--highlight)"`.
Nested inner elements use concentric smaller radii (inner = outer − padding → radii.sm/xs).

### Section card title (SectionedForm etc.)
Drop ALL-CAPS 800 labels. Use either a Sora 14/600 `var(--ink)` title (sentence case) with
optional 12.5 `var(--muted)` sub, or an eyebrow (below). No heavy uppercase tracking on titles.

### Eyebrow (sparingly — section intros, not every element)
`display:inline-flex; gap:8; fontSize:11; fontWeight:700; letterSpacing:"0.16em";
textTransform:"uppercase"; color:var(--muted)` preceded by a gold tick
`{width:16,height:2,background:brand.goldDk,borderRadius:2}`.

### Field label
Sentence case (`Cover`, not `COVER`). `fontSize:12.5; fontWeight:500; color:var(--muted);
marginBottom:8`. This kills the biggest "AI-admin" tell — do it everywhere.

### Input / select / textarea
`width:100%; border:1px solid var(--line); borderRadius:radii.md (14); padding:"12px 14px";
fontSize:15; background:var(--field); outline:none`. **Focus ring is global** (green ring
added in globals.css for `input/textarea/select:focus`) — do NOT add per-field focus JS.
Drop all `1.5px` borders → `1px`. (The shared `fieldInput`/`inp`/`sel` exports are already
updated — reuse them; don't redefine local input styles.)

### Button — primary
`background:brand.green; color:#fff; border:none; borderRadius:radii.md; fontFamily:font.ui;
fontWeight:600; boxShadow:"0 1px 0 rgba(255,255,255,.12) inset, 0 4px 12px rgba(11,70,52,.24)";
cursor:pointer; transition:"transform "+motion.fast+" "+motion.out`. Scale-on-press via
`onMouseDown=>scale(0.97)`, `onMouseUp/onMouseLeave=>scale(1)`. For a prominent CTA use the
**button-in-button**: `justify-content:space-between`, text left, a nested gold icon chip
right (`{width:32,height:32,borderRadius:radii.pill or sm,background:brand.gold}` holding an
Icon in `brand.green`). See Topbar `primary` + Login `button`.

### Button — secondary / ghost
`background:transparent` (or `var(--field)`); `border:1px solid var(--line)`;
`color:var(--ink)` (or `var(--muted)`); same radii + press physics.

### Pill / badge / chip
`borderRadius:radii.pill; fontSize:10.5; fontWeight:700; padding:"5px 12px"`. Status/media
colors from `statusPill()`/`mediaBadge()`. Add `className="tnum"` on any numeric pill.

### Toggle (form.tsx `Toggle` — already updated; reuse it)
Green track when on, off track `var(--line-strong)`, white knob with a soft shadow.

### Drawer / overlay (form.tsx `Drawer` — already updated; reuse it)
Editor drawers use `boxShadow: var(--sh-3)`, scrim `rgba(20,30,26,.4)`, refined header/footer,
save as button-in-button, cancel as ghost. Modals/popovers: `var(--card-raised)` + `var(--sh-3)`.

## Craft details (make-interfaces-feel-better)
- **Concentric radii** on every nested surface (thumb-in-shell like Dashboard `thumbShell`).
- **Shadows over borders** — replace section/card hairline borders with `--sh-1`.
- `className="tnum"` (tabular-nums) on all counts, durations, dates, ordinals.
- `textWrap:"balance"` on headings; press-scale 0.97 on buttons; ≥40×40 hit areas on icon buttons.
- Motion: transitions name exact properties (never `all`); use `motion.out`/`motion.standard`.
  `.rise` class (globals) for staggered entrances where a list/grid loads.
- Both themes must look right (everything flows through vars — verify dark isn't an afterthought).

## Hard rules
- No new dependencies, no Tailwind, no new fonts. Inline styles + CSS vars only.
- Do NOT touch `packages/*`, routing, data, or `@althaqalayn/*` imports.
- Keep the custom confirm/alert modal (`useConfirm`) behavior intact — restyle only.
- After your slice: the file(s) must typecheck. Report any shared-primitive change you needed.
