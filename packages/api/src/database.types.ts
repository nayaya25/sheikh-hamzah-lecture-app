// Hand-written mirror of the Postgres row shapes in schema.sql (snake_case).
// In a live project these would come from `supabase gen types typescript`;
// kept explicit here so the package typechecks without a running database.

import type {
  CollectionKind,
  Language,
  MediaType,
  PublishStatus,
  TranscriptStatus,
  UserRole,
} from "@althaqalayn/types";

export interface CollectionRow {
  id: string;
  title_en: string;
  title_ha: string | null;
  kind: CollectionKind;
  language: Language;
  cover_from: string | null;
  cover_to: string | null;
  cover_arabic: string | null;
  description_en: string | null;
  description_ha: string | null;
  featured: boolean;
  position: number;
}

export interface LectureRow {
  id: string;
  collection_id: string;
  title_en: string;
  title_ha: string | null;
  type: MediaType;
  language: Language;
  group_label: string | null;
  sort: number;
  media_url: string | null;
  body_en: string | null;
  body_ha: string | null;
  duration: number | null;
  date: string;
  year: string | null;
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
