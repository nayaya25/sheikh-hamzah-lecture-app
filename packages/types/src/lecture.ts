import type {
  ISODate,
  ISODateTime,
  Language,
  LectureId,
  LectureScope,
  LocalizedText,
  MediaType,
  ProgramId,
  PublishStatus,
  SeriesId,
  TranscriptId,
} from "./common";

/**
 * A single lecture — the atomic unit of the archive.
 *
 * A lecture is either `scope: "series"` (an episode of a per-year series within
 * a program, carrying an `episode` number) or `scope: "single"` (standalone;
 * `programId` optional, no episode number). Text lectures (`type: "text"`) open
 * the reader and use `body` instead of a streamed `mediaUrl`.
 */
export interface Lecture {
  id: LectureId;
  /** Title in English + Hausa (both entered in the admin editor). */
  title: LocalizedText;
  type: MediaType;
  scope: LectureScope;
  /** Original language of the recording/text. */
  language: Language;
  /** Length in seconds for audio/video; omitted for text. */
  duration?: number;
  /** Publication/recording date. */
  date: ISODate;
  /** Human year label spanning calendars, e.g. "1445 AH · 2024". */
  year?: string;
  description?: LocalizedText;
  /** Streamed source for audio/video. */
  mediaUrl?: string;
  /** Reader body copy for `type: "text"` lectures (localized). */
  body?: LocalizedText;
  transcriptId?: TranscriptId;
  /** Parent program — required for series episodes, optional for singles. */
  programId?: ProgramId;
  /** Per-year series this episode belongs to (series scope only). */
  seriesId?: SeriesId;
  /** Episode/part number within the series (series scope only). */
  episode?: number;
  status: PublishStatus;
  /** When `status === "scheduled"` — the auto-publish time (e.g. nightly Tafsīr). */
  scheduledFor?: ISODateTime;
  /** Surfaced as a daily highlight / Home feature. */
  featured?: boolean;
}
