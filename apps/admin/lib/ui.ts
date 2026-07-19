// Shared UI constants for the admin console. The deep green + gold are brand
// constants (the sidebar stays green in both themes); surface colors come from
// the CSS vars in globals.css.

import type { MediaType, PublishStatus } from "@althaqalayn/types";

export const brand = {
  green: "#0B4634",
  greenMid: "#12634E",
  greenDeepest: "#08382A",
  gold: "#E4C77B",
  goldDk: "#C79A3B",
} as const;

export const font = {
  heading: "var(--font-sora)",
  ui: "var(--font-instrument)",
  arabic: "var(--font-amiri)",
} as const;

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
