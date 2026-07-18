import type {
  Gradient,
  Language,
  LectureId,
  LocalizedText,
  ProgramId,
  SeriesId,
  SeriesKind,
} from "./common";

/** Cover artwork for a series — a CSS gradient plus an optional Arabic motif. */
export interface SeriesCover {
  gradient: Gradient;
  /** Large faint Amiri glyph shown on the cover (e.g. "ﷺ", a surah name). */
  arabic?: string;
}

/**
 * A per-year series of ordered episodes (e.g. "Ramadan Tafsīr 1445"). Belongs to
 * a parent {@link Program}; a program spans many years, each year its own series.
 * Occasion/topic/book series may stand under a program too, or on their own.
 */
export interface Series {
  id: SeriesId;
  /** Parent program grouping; omitted for a truly standalone series. */
  programId?: ProgramId;
  title: LocalizedText;
  kind: SeriesKind;
  /** Year label for per-year series, e.g. "1445 AH · 2024". */
  year?: string;
  /** Occasion label when `kind === "occasion"` (e.g. "Maulud", "Ashura"). */
  occasion?: string;
  language: Language;
  cover: SeriesCover;
  description?: LocalizedText;
  /** Episodes in play order. */
  lectureIds: LectureId[];
  /** Shown in the Home "Featured series" rail. */
  featured?: boolean;
}
