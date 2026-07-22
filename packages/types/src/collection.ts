import type { CollectionId, CollectionKind, Gradient, Language, LocalizedText } from "./common";

/** Cover artwork for a collection — a CSS gradient plus an optional Arabic motif. */
export interface CollectionCover {
  gradient: Gradient;
  /** Large faint Amiri glyph shown on the cover (e.g. "ﷺ", a surah name). */
  arabic?: string;
}

/** A browsable grouping of lectures. `kind` drives how the app lays it out:
 *  occasion/topic group their lectures by `Lecture.groupLabel`; series shows a flat ordered list. */
export interface Collection {
  id: CollectionId;
  title: LocalizedText;
  kind: CollectionKind;
  language: Language;
  cover: CollectionCover;
  description?: LocalizedText;
  featured?: boolean;
  /** Order in browse lists. */
  position?: number;
}
