import type { LocalizedText, ProgramId, SeriesId } from "./common";

/**
 * A program/collection — the top of the content hierarchy
 * (Program → per-year Series → Episode). E.g. "Ramadan Tafsīr" spans many years,
 * each year being its own {@link Series}. Singles may reference a program loosely.
 */
export interface Program {
  id: ProgramId;
  title: LocalizedText;
  /** Arabic motif shown on program covers/headers. */
  arabic?: string;
  description?: LocalizedText;
  /** Per-year series under this program, newest-first. */
  seriesIds: SeriesId[];
}
