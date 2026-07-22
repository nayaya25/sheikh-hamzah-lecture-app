// Pure row → domain mappers. DB rows are snake_case with nullable columns and
// split *_en/*_ha localized fields; domain types are camelCase with a
// LocalizedText object and omit-when-absent optionals. These are the seam, so
// they're the part worth unit-testing.

import type { Album, Collection, Lecture, LocalizedText, Photo, Transcript, User } from "@althaqalayn/types";
import type {
  AdminUserRow,
  AlbumRow,
  CollectionRow,
  LectureRow,
  PhotoRow,
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

export function mapCollection(row: CollectionRow): Collection {
  return compact<Collection>({
    id: row.id,
    title: locRequired(row.title_en, row.title_ha),
    kind: row.kind,
    language: row.language,
    cover: compact({
      gradient: [row.cover_from ?? "", row.cover_to ?? ""] as const,
      arabic: row.cover_arabic ?? undefined,
    }),
    description: loc(row.description_en, row.description_ha),
    featured: row.featured || undefined,
    position: row.position,
  });
}

export function mapLecture(row: LectureRow): Lecture {
  return compact<Lecture>({
    id: row.id,
    collectionId: row.collection_id,
    title: locRequired(row.title_en, row.title_ha),
    type: row.type,
    language: row.language,
    groupLabel: row.group_label ?? undefined,
    sort: row.sort,
    duration: row.duration ?? undefined,
    date: row.date,
    year: row.year ?? undefined,
    mediaUrl: row.media_url ?? undefined,
    body: loc(row.body_en, row.body_ha),
    status: row.status,
    scheduledFor: row.scheduled_for ?? undefined,
    featured: row.featured || undefined,
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
