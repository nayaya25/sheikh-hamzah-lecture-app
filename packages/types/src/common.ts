// Shared primitives for the Althaqalayn content model.
// Enumerable unions are declared as `const` tuples so the allowed values exist
// at runtime (for validation, admin dropdowns, and tests) and the string-literal
// union type is derived from them — one source of truth, never restated.

/** Media a lecture is delivered as. Text lectures open the reader, not the player. */
export const MEDIA_TYPES = ["audio", "video", "text"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

/** English-first UI with a Hausa toggle; content is tagged per item. */
export const LANGUAGES = ["en", "ha"] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * Whether a lecture belongs to a per-year series (with an episode number) or
 * stands alone. Supersedes the earlier flat series-only model.
 */
export const LECTURE_SCOPES = ["series", "single"] as const;
export type LectureScope = (typeof LECTURE_SCOPES)[number];

/** Admin publish lifecycle. `scheduled` carries a future `scheduledFor` datetime. */
export const PUBLISH_STATUSES = ["published", "draft", "scheduled"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

/**
 * How a series is surfaced. `recency` = latest lectures on Home;
 * `occasion` = Maulud/Ashura etc; `topic` = ethics/society; `book` = a text series.
 */
export const SERIES_KINDS = ["recency", "occasion", "topic", "book"] as const;
export type SeriesKind = (typeof SERIES_KINDS)[number];

/** Transcript coverage, mirrored by the admin Transcripts summary counts. */
export const TRANSCRIPT_STATUSES = ["complete", "auto-needs-review", "missing"] as const;
export type TranscriptStatus = (typeof TRANSCRIPT_STATUSES)[number];

/** Admin console account roles. */
export const USER_ROLES = ["owner", "editor", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** A CSS cover gradient as a `[from, to]` pair — matches `@althaqalayn/theme`. */
export type Gradient = readonly [from: string, to: string];

/**
 * A string of localized copy. `en` is required (English-first UI); `ha` is the
 * Hausa rendering supplied for most content and all reader body text.
 */
export interface LocalizedText {
  en: string;
  ha?: string;
}

/** ISO-8601 calendar date, e.g. "2024-03-11". */
export type ISODate = string;
/** ISO-8601 datetime, e.g. "2024-03-11T19:30:00Z" (used for scheduling). */
export type ISODateTime = string;

// Entity id aliases — documented intent without the friction of branded types,
// so raw API strings flow in without casts.
export type LectureId = string;
export type SeriesId = string;
export type ProgramId = string;
export type CategoryId = string;
export type AlbumId = string;
export type PhotoId = string;
export type TranscriptId = string;
export type UserId = string;
