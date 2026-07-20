// View-model types + pure helpers for the catalog. The actual data comes from
// Supabase via @/lib/catalogProvider — there is no bundled sample content.

import type { MediaType, SeriesKind } from "@althaqalayn/types";
import type { Gradient } from "@/lib/sampleData";

export interface SampleSeries {
  id: string;
  /** Display label (occasion label or uppercased kind). */
  kind: string;
  /** Raw enum kind, for filtering (Library segments). */
  kindRaw: SeriesKind;
  title: string;
  ar: string;
  year: string;
  count: number;
  media: string;
  lang: string;
  gradient: Gradient;
  desc: string;
}

/** A lecture the player can load. */
export interface Playable {
  id: string;
  title: string;
  sub: string;
  seriesId: string;
  type: MediaType;
  durSec: number;
  ar: string;
  episode?: number;
  mediaUrl?: string;
  gradient?: Gradient;
  seriesTitle?: string;
}

const DEFAULT_GRADIENT: Gradient = ["#0B4634", "#17795E"];

/** The cover gradient for a lecture tile. */
export function gradientForLecture(p: Playable): Gradient {
  return p.gradient ?? DEFAULT_GRADIENT;
}

/** "m:ss" for a scrubber. */
export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Human duration label for an episode row. */
export function durationLabel(p: Playable): string {
  const min = Math.round(p.durSec / 60);
  return p.type === "text" ? `${min} min read` : `${min} min`;
}
