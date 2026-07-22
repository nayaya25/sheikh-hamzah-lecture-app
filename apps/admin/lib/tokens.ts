// Typed design tokens for inline-style components. Values mirror the CSS custom
// properties in app/globals.css. Prefer var(--token) references so a single
// source (globals.css) drives both themes; literal scales (radii/space) are
// provided as numbers for arithmetic (e.g. concentric radius math).

/** Surface + ink + line tokens, as CSS var references (theme-aware). */
export const c = {
  paper: "var(--paper)",
  paper2: "var(--paper-2)",
  card: "var(--card)",
  cardRaised: "var(--card-raised)",
  ink: "var(--ink)",
  muted: "var(--muted)",
  faint: "var(--faint)",
  line: "var(--line)",
  lineStrong: "var(--line-strong)",
  field: "var(--field)",
  chip: "var(--chip)",
  gold: "var(--gold)",
} as const;

/** Border radii (px). Concentric rule: inner = outer − padding. */
export const radii = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/** Spacing scale (px, 4px base). */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  14: 56,
  18: 72,
} as const;

/** Layered elevation shadows (theme-aware via var refs). */
export const shadow = {
  s1: "var(--sh-1)",
  s2: "var(--sh-2)",
  s3: "var(--sh-3)",
  highlight: "var(--highlight)",
  /** Card at rest: elevation + top inner highlight. */
  card: "var(--sh-1), var(--highlight)",
  cardHover: "var(--sh-2), var(--highlight)",
} as const;

/** Motion easings + durations. */
export const motion = {
  out: "cubic-bezier(0.32,0.72,0,1)",
  standard: "cubic-bezier(0.65,0,0.35,1)",
  fast: "140ms",
  base: "220ms",
  slow: "380ms",
} as const;

/** Standard transition for interactive surfaces (never `all`). */
export const lift = {
  transition: `transform ${motion.base} ${motion.out}, box-shadow ${motion.base} ${motion.out}, background ${motion.fast} ${motion.standard}`,
} as const;
