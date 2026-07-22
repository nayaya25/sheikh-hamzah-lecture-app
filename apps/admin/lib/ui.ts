// Shared UI constants for the admin console. Brand green/gold, matching the
// modern rebuild prototype (docs/superpowers/prototypes/admin-modern.html)
// hex-for-hex — greenDeepest is an extra deep ramp (Login's brand panel,
// pre-modern gradients) with no direct prototype var. Surface colors come
// from the CSS vars in globals.css.

import type { MediaType, PublishStatus } from "@althaqalayn/types";

export const brand = {
  green: "#0B4634", // --green
  greenMid: "#12634E", // --green-2
  greenDeepest: "#08382A",
  greenBright: "#17795E", // --green-bright
  gold: "#E4C77B", // gold on dark / on green (--gold, dark theme)
  goldDk: "#C79A3B", // gold on light surfaces, AA text (--gold, light theme)
  goldWash: "#FBF1DA", // --gold-wash
} as const;

export const font = {
  heading: "var(--font-sora), system-ui, sans-serif",
  ui: "var(--font-instrument), system-ui, sans-serif",
  arabic: "var(--font-amiri), 'Amiri', Georgia, serif",
} as const;

// Year options for lecture/series editors: Gregorian 2026 → 1990, each labelled
// with its approximate Hijri year ("1446 AH · 2025"), matching the seed format.
export const YEARS: string[] = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => {
  const g = 2026 - i;
  const ah = Math.round((g - 622) * 1.030684);
  return `${ah} AH · ${g}`;
});

const STATUS_COLORS: Record<PublishStatus, { bg: string; fg: string; label: string }> = {
  published: { bg: "#EAF3EF", fg: "#12634E", label: "Published" },
  draft: { bg: "#EFEFEA", fg: "#8b8b7e", label: "Draft" },
  scheduled: { bg: "#FBF1DA", fg: "#9a7420", label: "Scheduled" },
};

export function statusPill(status: PublishStatus) {
  return STATUS_COLORS[status];
}

const MEDIA_COLORS: Record<MediaType, { bg: string; fg: string }> = {
  audio: { bg: "#EAF3EF", fg: "#12634E" },
  video: { bg: "#F6ECEC", fg: "#a23e3e" },
  text: { bg: "#F1EEF6", fg: "#6a4f9c" },
};

export function mediaBadge(type: MediaType) {
  return MEDIA_COLORS[type];
}

/** A cover gradient for a series/lecture tile, given its [from,to] colors. */
export function coverGradient(from?: string, to?: string): string {
  return `linear-gradient(140deg, ${from ?? brand.green}, ${to ?? "#17795E"})`;
}
