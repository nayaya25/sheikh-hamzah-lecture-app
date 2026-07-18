// Hand-written mirror of the Postgres row shapes in schema.sql (snake_case).
// In a live project these would come from `supabase gen types typescript`;
// kept explicit here so the package typechecks without a running database.

import type {
  Language,
  LectureScope,
  MediaType,
  PublishStatus,
  SeriesKind,
  TranscriptStatus,
  UserRole,
} from "@althaqalayn/types";

export interface ProgramRow {
  id: string;
  title_en: string;
  title_ha: string | null;
  arabic: string | null;
  description_en: string | null;
  description_ha: string | null;
}

export interface SeriesRow {
  id: string;
  program_id: string | null;
  title_en: string;
  title_ha: string | null;
  kind: SeriesKind;
  year: string | null;
  occasion: string | null;
  language: Language;
  cover_from: string;
  cover_to: string;
  cover_arabic: string | null;
  description_en: string | null;
  description_ha: string | null;
  featured: boolean;
  position: number;
}

export interface LectureRow {
  id: string;
  title_en: string;
  title_ha: string | null;
  type: MediaType;
  scope: LectureScope;
  language: Language;
  duration: number | null;
  date: string;
  year: string | null;
  description_en: string | null;
  description_ha: string | null;
  media_url: string | null;
  body_en: string | null;
  body_ha: string | null;
  program_id: string | null;
  series_id: string | null;
  episode: number | null;
  status: PublishStatus;
  scheduled_for: string | null;
  featured: boolean;
}

export interface TranscriptRow {
  id: string;
  lecture_id: string;
  language: Language;
  status: TranscriptStatus;
  body_en: string | null;
  body_ha: string | null;
}

export interface CategoryRow {
  id: string;
  label: string;
  ar: string;
  meta: string | null;
  active: boolean;
  archived: boolean;
  position: number;
}

export interface AlbumRow {
  id: string;
  title: string;
  date: string;
  event: string | null;
  cover: string | null;
  published: boolean;
}

export interface PhotoRow {
  id: string;
  album_id: string;
  url: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  position: number;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
