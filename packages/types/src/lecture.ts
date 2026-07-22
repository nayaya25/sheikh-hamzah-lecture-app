import type {
  CollectionId,
  ISODate,
  ISODateTime,
  Language,
  LectureId,
  LocalizedText,
  MediaType,
  PublishStatus,
  TranscriptId,
} from "./common";

/**
 * A single lecture — the atomic unit of the archive, belonging to exactly one
 * {@link Collection}. Text lectures (`type: "text"`) open the reader and use
 * `body` instead of a streamed `mediaUrl`.
 */
export interface Lecture {
  id: LectureId;
  /** Parent collection this lecture belongs to. */
  collectionId: CollectionId;
  /** Title in English + Hausa (both entered in the admin editor). */
  title: LocalizedText;
  type: MediaType;
  /** Original language of the recording/text. */
  language: Language;
  /** Sub-heading within an occasion/topic collection ("1445 AH", "2023 Elections"); omitted for a flat series. */
  groupLabel?: string;
  /** Order within the collection (episode/sitting order). */
  sort: number;
  /** Length in seconds for audio/video; omitted for text. */
  duration?: number;
  /** Publication/recording date. */
  date: ISODate;
  /** Optional display/filter label, e.g. "1445 AH · 2024". */
  year?: string;
  /** Streamed source for audio/video. */
  mediaUrl?: string;
  /** Reader body copy for `type: "text"` lectures (localized). */
  body?: LocalizedText;
  transcriptId?: TranscriptId;
  status: PublishStatus;
  /** When `status === "scheduled"` — the auto-publish time (e.g. nightly Tafsīr). */
  scheduledFor?: ISODateTime;
  /** Surfaced as a daily highlight / Home feature. */
  featured?: boolean;
}
