import type {
  Language,
  LectureId,
  LocalizedText,
  TranscriptId,
  TranscriptStatus,
} from "./common";

/**
 * A lecture transcript — drives the player's Hausa transcript panel and the
 * admin Transcripts view (Review/Generate). `status` mirrors the admin summary
 * counts (Complete / Auto-needs-review / Missing).
 */
export interface Transcript {
  id: TranscriptId;
  lectureId: LectureId;
  language: Language;
  status: TranscriptStatus;
  /** Full transcript text; localized when a translation exists. */
  body?: LocalizedText;
}
