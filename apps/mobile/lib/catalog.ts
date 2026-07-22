// View-model types + pure helpers for the catalog. The actual data comes from
// Supabase via @/lib/catalogProvider — there is no bundled sample content.

import type { CollectionKind, Language, MediaType } from "@althaqalayn/types";
import type { Gradient } from "@/lib/sampleData";

/**
 * Browse-list view-model for a Collection — id/title/kind/cover plus a
 * derived lecture `count`; screens work off this instead of the raw domain
 * `Collection` shape.
 */
export interface CollectionVM {
  id: string;
  title: string;
  kind: CollectionKind;
  language: Language;
  cover: { gradient: Gradient; arabic?: string };
  description?: string;
  /** Number of lectures in this collection. */
  count: number;
  featured?: boolean;
  position?: number;
}

/** A lecture the player can load. */
export interface Playable {
  id: string;
  title: string;
  sub: string;
  collectionId: string;
  type: MediaType;
  durSec: number;
  ar: string;
  /** Sub-heading within an occasion/topic collection ("1445 AH"); omitted for a flat series. */
  groupLabel?: string;
  /** Order within the parent collection (episode/sitting order). */
  sort: number;
  mediaUrl?: string;
  gradient?: Gradient;
  collectionTitle?: string;
}

/** One `groupLabel` bucket within an occasion/topic collection's lecture list. */
export interface LectureGroup {
  label: string;
  lectures: Playable[];
}

const DEFAULT_GRADIENT: Gradient = ["#0B4634", "#17795E"];

/** The cover gradient for a lecture tile. */
export function gradientForLecture(p: Playable): Gradient {
  return p.gradient ?? DEFAULT_GRADIENT;
}

/**
 * Pure: the shared collection-lectures rendering rule — same rule as admin's
 * `groupLectures` (apps/admin/lib/useContentTree.ts), owned separately here
 * since mobile doesn't import from the admin app. `series` collections render
 * as one flat `sort`-ordered list (ignoring `groupLabel`); `occasion`/`topic`
 * collections group lectures by `groupLabel` (label-less lectures fall into a
 * trailing "Ungrouped" bucket), groups appear in first-appearance order, and
 * lectures within a group stay `sort`-ordered. `lectures` must already be
 * `sort`-ordered.
 */
export function groupLectures(kind: CollectionKind, lectures: Playable[]): Playable[] | LectureGroup[] {
  if (kind === "series") return lectures;

  const order: string[] = [];
  const byLabel = new Map<string, Playable[]>();
  const ungrouped: Playable[] = [];
  for (const l of lectures) {
    if (!l.groupLabel) {
      ungrouped.push(l);
      continue;
    }
    if (!byLabel.has(l.groupLabel)) {
      byLabel.set(l.groupLabel, []);
      order.push(l.groupLabel);
    }
    byLabel.get(l.groupLabel)!.push(l);
  }

  const groups: LectureGroup[] = order.map((label) => ({ label, lectures: byLabel.get(label)! }));
  if (ungrouped.length) groups.push({ label: "Ungrouped", lectures: ungrouped });
  return groups;
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

/** Human storage size for the Downloads footer — MB under 1 GB, else GB. */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  const gb = mb / 1024;
  return `${gb < 10 ? gb.toFixed(1) : Math.round(gb)} GB`;
}
