// Admin console: auth + full CRUD. All writes require an authenticated admin
// session; RLS rejects them otherwise. Reads here are unfiltered (all statuses),
// unlike the public content.ts queries.

import type {
  Album,
  Category,
  Lecture,
  LocalizedText,
  Photo,
  Program,
  Series,
  Transcript,
  User,
} from "@althaqalayn/types";
import type { AlthaqalaynClient } from "./client";
import { unwrap } from "./client";
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
import {
  mapAlbum,
  mapCategory,
  mapLecture,
  mapPhoto,
  mapProgram,
  mapSeries,
  mapTranscript,
  mapUser,
} from "./mappers";

// Write payloads: the domain object without server-managed ids/children.
export type LectureInput = Omit<Lecture, "id">;
export type SeriesInput = Omit<Series, "id" | "lectureIds">;
export type ProgramInput = Omit<Program, "id" | "seriesIds">;
export type CategoryInput = Omit<Category, "id">;
export type AlbumInput = Omit<Album, "id" | "photos">;
export type PhotoInput = Omit<Photo, "id">;
export type TranscriptInput = Omit<Transcript, "id">;

const en = (t?: LocalizedText) => t?.en ?? null;
const ha = (t?: LocalizedText) => t?.ha ?? null;

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function signIn(client: AlthaqalaynClient, email: string, password: string) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut(client: AlthaqalaynClient): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) throw new Error(error.message);
}

/** The signed-in admin's profile row (name + role), or null if not an admin. */
export async function getCurrentAdmin(client: AlthaqalaynClient): Promise<User | null> {
  const { data } = await client.auth.getUser();
  if (!data.user) return null;
  const row = unwrap<AdminUserRow | null>(
    await client.from("admin_users").select("*").eq("id", data.user.id).maybeSingle(),
  );
  return row ? mapUser(row) : null;
}

export async function listAdminUsers(client: AlthaqalaynClient): Promise<User[]> {
  const rows = unwrap<AdminUserRow[]>(await client.from("admin_users").select("*").order("name"));
  return rows.map(mapUser);
}

// ── Lectures ─────────────────────────────────────────────────────────────────
export async function listAllLectures(client: AlthaqalaynClient): Promise<Lecture[]> {
  const rows = unwrap<LectureRow[]>(
    await client.from("lectures").select("*").order("date", { ascending: false }),
  );
  return rows.map(mapLecture);
}

export async function upsertLecture(
  client: AlthaqalaynClient,
  input: LectureInput,
  id?: string,
): Promise<Lecture> {
  const row = {
    ...(id ? { id } : {}),
    title_en: input.title.en,
    title_ha: ha(input.title),
    type: input.type,
    scope: input.scope,
    language: input.language,
    duration: input.duration ?? null,
    date: input.date,
    year: input.year ?? null,
    description_en: en(input.description),
    description_ha: ha(input.description),
    media_url: input.mediaUrl ?? null,
    body_en: en(input.body),
    body_ha: ha(input.body),
    program_id: input.programId ?? null,
    series_id: input.seriesId ?? null,
    episode: input.episode ?? null,
    status: input.status,
    scheduled_for: input.scheduledFor ?? null,
    featured: input.featured ?? false,
  };
  const saved = unwrap<LectureRow>(
    await client.from("lectures").upsert(row).select("*").single(),
  );
  return mapLecture(saved);
}

export async function deleteLecture(client: AlthaqalaynClient, id: string): Promise<void> {
  const { error } = await client.from("lectures").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Series ───────────────────────────────────────────────────────────────────
export async function upsertSeries(
  client: AlthaqalaynClient,
  input: SeriesInput,
  id?: string,
): Promise<Series> {
  const row = {
    ...(id ? { id } : {}),
    program_id: input.programId ?? null,
    title_en: input.title.en,
    title_ha: ha(input.title),
    kind: input.kind,
    year: input.year ?? null,
    occasion: input.occasion ?? null,
    language: input.language,
    cover_from: input.cover.gradient[0],
    cover_to: input.cover.gradient[1],
    cover_arabic: input.cover.arabic ?? null,
    description_en: en(input.description),
    description_ha: ha(input.description),
    featured: input.featured ?? false,
  };
  const saved = unwrap<SeriesRow>(await client.from("series").upsert(row).select("*").single());
  return mapSeries(saved);
}

export async function deleteSeries(client: AlthaqalaynClient, id: string): Promise<void> {
  const { error } = await client.from("series").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Programs ─────────────────────────────────────────────────────────────────
export async function upsertProgram(
  client: AlthaqalaynClient,
  input: ProgramInput,
  id?: string,
): Promise<Program> {
  const row = {
    ...(id ? { id } : {}),
    title_en: input.title.en,
    title_ha: ha(input.title),
    arabic: input.arabic ?? null,
    description_en: en(input.description),
    description_ha: ha(input.description),
  };
  const saved = unwrap<ProgramRow>(await client.from("programs").upsert(row).select("*").single());
  return mapProgram(saved);
}

export async function deleteProgram(client: AlthaqalaynClient, id: string): Promise<void> {
  const { error } = await client.from("programs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Categories ───────────────────────────────────────────────────────────────
export async function listAllCategories(client: AlthaqalaynClient): Promise<Category[]> {
  const rows = unwrap<CategoryRow[]>(await client.from("categories").select("*").order("position"));
  return rows.map(mapCategory);
}

export async function upsertCategory(
  client: AlthaqalaynClient,
  input: CategoryInput,
  id?: string,
): Promise<Category> {
  const row = {
    ...(id ? { id } : {}),
    label: input.label,
    ar: input.ar,
    meta: input.meta ?? null,
    active: input.active,
    archived: input.archived,
  };
  const saved = unwrap<CategoryRow>(
    await client.from("categories").upsert(row).select("*").single(),
  );
  return mapCategory(saved);
}

// ── Transcripts ──────────────────────────────────────────────────────────────
export async function upsertTranscript(
  client: AlthaqalaynClient,
  input: TranscriptInput,
  id?: string,
): Promise<Transcript> {
  const row = {
    ...(id ? { id } : {}),
    lecture_id: input.lectureId,
    language: input.language,
    status: input.status,
    body_en: en(input.body),
    body_ha: ha(input.body),
  };
  const saved = unwrap<TranscriptRow>(
    await client.from("transcripts").upsert(row).select("*").single(),
  );
  return mapTranscript(saved);
}

// ── Gallery ──────────────────────────────────────────────────────────────────
export async function upsertAlbum(
  client: AlthaqalaynClient,
  input: AlbumInput,
  id?: string,
): Promise<Album> {
  const row = {
    ...(id ? { id } : {}),
    title: input.title,
    date: input.date,
    event: input.event ?? null,
    cover: input.cover ?? null,
    published: input.published,
  };
  const saved = unwrap<AlbumRow>(await client.from("albums").upsert(row).select("*").single());
  return mapAlbum(saved);
}

export async function deleteAlbum(client: AlthaqalaynClient, id: string): Promise<void> {
  const { error } = await client.from("albums").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addPhoto(
  client: AlthaqalaynClient,
  albumId: string,
  input: PhotoInput,
): Promise<Photo> {
  const row = {
    album_id: albumId,
    url: input.url,
    caption: input.caption ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
  };
  const saved = unwrap<PhotoRow>(await client.from("photos").insert(row).select("*").single());
  return mapPhoto(saved);
}

export async function deletePhoto(client: AlthaqalaynClient, id: string): Promise<void> {
  const { error } = await client.from("photos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
