// Pure row → domain mappers. DB rows are snake_case with nullable columns and
// split *_en/*_ha localized fields; domain types are camelCase with a
// LocalizedText object and omit-when-absent optionals. These are the seam, so
// they're the part worth unit-testing.

import type {
  Album,
  Category,
  Lecture,
  LectureId,
  LocalizedText,
  Photo,
  Program,
  Series,
  SeriesId,
  Transcript,
  User,
} from "@althaqalayn/types";
import type {
  AdminUserRow,
  AlbumRow,
  CategoryRow,
  LectureRow,
  PhotoRow,
  ProgramRow,
  SeriesRow,
  TranscriptRow,
} from "./database.types";

/** Build a required LocalizedText, including `ha` only when present. */
function locRequired(en: string, ha: string | null): LocalizedText {
  return ha != null ? { en, ha } : { en };
}

/** Build an optional LocalizedText — undefined when no copy exists at all. */
function loc(en: string | null, ha: string | null): LocalizedText | undefined {
  if (en == null && ha == null) return undefined;
  return locRequired(en ?? "", ha);
}

/** Drop `undefined`-valued keys so optional fields are absent, not `: undefined`. */
function compact<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

export function mapLecture(row: LectureRow): Lecture {
  return compact<Lecture>({
    id: row.id,
    title: locRequired(row.title_en, row.title_ha),
    type: row.type,
    scope: row.scope,
    language: row.language,
    duration: row.duration ?? undefined,
    date: row.date,
    year: row.year ?? undefined,
    description: loc(row.description_en, row.description_ha),
    mediaUrl: row.media_url ?? undefined,
    body: loc(row.body_en, row.body_ha),
    programId: row.program_id ?? undefined,
    seriesId: row.series_id ?? undefined,
    episode: row.episode ?? undefined,
    status: row.status,
    scheduledFor: row.scheduled_for ?? undefined,
    featured: row.featured || undefined,
  });
}

/** Series episodes come from a separate ordered query, passed in as ids. */
export function mapSeries(row: SeriesRow, lectureIds: LectureId[] = []): Series {
  return compact<Series>({
    id: row.id,
    programId: row.program_id ?? undefined,
    title: locRequired(row.title_en, row.title_ha),
    kind: row.kind,
    year: row.year ?? undefined,
    occasion: row.occasion ?? undefined,
    language: row.language,
    cover: compact({
      gradient: [row.cover_from, row.cover_to] as const,
      arabic: row.cover_arabic ?? undefined,
    }),
    description: loc(row.description_en, row.description_ha),
    lectureIds,
    featured: row.featured || undefined,
  });
}

/** Program's per-year series come from a separate ordered query. */
export function mapProgram(row: ProgramRow, seriesIds: SeriesId[] = []): Program {
  return compact<Program>({
    id: row.id,
    title: locRequired(row.title_en, row.title_ha),
    arabic: row.arabic ?? undefined,
    description: loc(row.description_en, row.description_ha),
    seriesIds,
  });
}

export function mapTranscript(row: TranscriptRow): Transcript {
  return compact<Transcript>({
    id: row.id,
    lectureId: row.lecture_id,
    language: row.language,
    status: row.status,
    body: loc(row.body_en, row.body_ha),
  });
}

export function mapCategory(row: CategoryRow): Category {
  return compact<Category>({
    id: row.id,
    label: row.label,
    ar: row.ar,
    meta: row.meta ?? undefined,
    active: row.active,
    archived: row.archived,
  });
}

export function mapPhoto(row: PhotoRow): Photo {
  return compact<Photo>({
    id: row.id,
    url: row.url,
    caption: row.caption ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
  });
}

export function mapAlbum(row: AlbumRow, photos: Photo[] = []): Album {
  return compact<Album>({
    id: row.id,
    title: row.title,
    date: row.date,
    event: row.event ?? undefined,
    cover: row.cover ?? undefined,
    photos,
    published: row.published,
  });
}

export function mapUser(row: AdminUserRow): User {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}
