// Admin console: auth + full CRUD. All writes require an authenticated admin
// session; RLS rejects them otherwise. Reads here are unfiltered (all statuses),
// unlike the public content.ts queries.

import type { Album, Collection, Lecture, LocalizedText, Photo, Transcript, User } from "@althaqalayn/types";
import type { AlthaqalaynClient } from "./client";
import { unwrap } from "./client";
import type {
  AdminUserRow,
  AlbumRow,
  CollectionRow,
  LectureRow,
  PhotoRow,
  TranscriptRow,
} from "./database.types";
import { mapAlbum, mapCollection, mapLecture, mapPhoto, mapTranscript, mapUser } from "./mappers";

// Write payloads: the domain object without server-managed ids/children.
export type CollectionInput = Omit<Collection, "id">;
export type LectureInput = Omit<Lecture, "id">;
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

// ── Collections ──────────────────────────────────────────────────────────────
export async function listAllCollections(client: AlthaqalaynClient): Promise<Collection[]> {
  const rows = unwrap<CollectionRow[]>(
    await client.from("collections").select("*").order("position"),
  );
  return rows.map(mapCollection);
}

export async function upsertCollection(
  client: AlthaqalaynClient,
  input: CollectionInput,
  id?: string,
): Promise<Collection> {
  const row = {
    ...(id ? { id } : {}),
    title_en: input.title.en,
    title_ha: ha(input.title),
    kind: input.kind,
    language: input.language,
    cover_from: input.cover.gradient[0],
    cover_to: input.cover.gradient[1],
    cover_arabic: input.cover.arabic ?? null,
    description_en: en(input.description),
    description_ha: ha(input.description),
    featured: input.featured ?? false,
    position: input.position ?? 0,
  };
  const saved = unwrap<CollectionRow>(
    await client.from("collections").upsert(row).select("*").single(),
  );
  return mapCollection(saved);
}

/** Cascade to the collection's lectures is handled by the FK's `on delete cascade`. */
export async function deleteCollection(client: AlthaqalaynClient, id: string): Promise<void> {
  const { error } = await client.from("collections").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Persist a new collection display order (writes the `position` column). */
export async function setCollectionPositions(
  client: AlthaqalaynClient,
  orderedIds: string[],
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      client
        .from("collections")
        .update({ position: index })
        .eq("id", id)
        .then((r) => {
          if (r.error) throw new Error(r.error.message);
        }),
    ),
  );
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
    collection_id: input.collectionId,
    title_en: input.title.en,
    title_ha: ha(input.title),
    type: input.type,
    language: input.language,
    group_label: input.groupLabel ?? null,
    sort: input.sort,
    duration: input.duration ?? null,
    date: input.date,
    year: input.year ?? null,
    media_url: input.mediaUrl ?? null,
    body_en: en(input.body),
    body_ha: ha(input.body),
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

/** Persist a new lecture order within a collection (writes the `sort` column). */
export async function setLectureSort(
  client: AlthaqalaynClient,
  orderedIds: string[],
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      client
        .from("lectures")
        .update({ sort: index })
        .eq("id", id)
        .then((r) => {
          if (r.error) throw new Error(r.error.message);
        }),
    ),
  );
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

export async function deleteTranscript(client: AlthaqalaynClient, id: string): Promise<void> {
  const { error } = await client.from("transcripts").delete().eq("id", id);
  if (error) throw new Error(error.message);
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

/** Persist a new photo order within an album (writes the `position` column). */
export async function setPhotoPositions(
  client: AlthaqalaynClient,
  orderedIds: string[],
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      client.from("photos").update({ position: index }).eq("id", id).then((r) => {
        if (r.error) throw new Error(r.error.message);
      }),
    ),
  );
}

/** Update an existing photo's caption (null clears it). */
export async function updatePhoto(
  client: AlthaqalaynClient,
  id: string,
  patch: { caption?: string | null },
): Promise<void> {
  const { error } = await client.from("photos").update({ caption: patch.caption ?? null }).eq("id", id);
  if (error) throw new Error(error.message);
}
