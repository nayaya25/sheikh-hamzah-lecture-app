// Public content reads for the mobile app. Every query is further constrained by
// RLS to published content, so these are safe even with the anon key.

import type { Album, Collection, Language, Lecture, MediaType, Transcript } from "@althaqalayn/types";
import type { AlthaqalaynClient } from "./client";
import { unwrap } from "./client";
import type { AlbumRow, CollectionRow, LectureRow, PhotoRow, TranscriptRow } from "./database.types";
import { mapAlbum, mapCollection, mapLecture, mapPhoto, mapTranscript } from "./mappers";

// ── Collections ──────────────────────────────────────────────────────────────
export async function listCollections(client: AlthaqalaynClient): Promise<Collection[]> {
  const rows = unwrap<CollectionRow[]>(
    await client.from("collections").select("*").order("position"),
  );
  return rows.map(mapCollection);
}

export async function collectionById(
  client: AlthaqalaynClient,
  id: string,
): Promise<Collection | null> {
  const row = unwrap<CollectionRow | null>(
    await client.from("collections").select("*").eq("id", id).maybeSingle(),
  );
  return row ? mapCollection(row) : null;
}

/** Home "Featured" shelf. */
export async function listFeaturedCollections(client: AlthaqalaynClient): Promise<Collection[]> {
  const rows = unwrap<CollectionRow[]>(
    await client.from("collections").select("*").eq("featured", true).order("position"),
  );
  return rows.map(mapCollection);
}

// ── Lectures ─────────────────────────────────────────────────────────────────
/** A collection's lectures, published and ordered by `sort` (Collection detail screen). */
export async function lecturesForCollection(
  client: AlthaqalaynClient,
  collectionId: string,
): Promise<Lecture[]> {
  const rows = unwrap<LectureRow[]>(
    await client
      .from("lectures")
      .select("*")
      .eq("collection_id", collectionId)
      .order("sort", { ascending: true }),
  );
  return rows.map(mapLecture);
}

/** Newest published lectures for the Home "Latest lectures" list. */
export async function listLatestLectures(
  client: AlthaqalaynClient,
  limit = 20,
): Promise<Lecture[]> {
  const rows = unwrap<LectureRow[]>(
    await client.from("lectures").select("*").order("date", { ascending: false }).limit(limit),
  );
  return rows.map(mapLecture);
}

export async function getLecture(
  client: AlthaqalaynClient,
  id: string,
): Promise<Lecture | null> {
  const row = unwrap<LectureRow | null>(
    await client.from("lectures").select("*").eq("id", id).maybeSingle(),
  );
  return row ? mapLecture(row) : null;
}

/**
 * Escape PostgREST filter metacharacters so a raw search string can't inject
 * extra filters into an `.or()` expression (`,` `(` `)` split/group; `%` is an
 * ilike wildcard; `\` is the escape char and must go first).
 */
export function escapePostgrestLike(value: string): string {
  return value.replace(/[\\,()%]/g, (c) => `\\${c}`);
}

/** Free-text search over lecture titles, optionally filtered by media type. */
export async function searchLectures(
  client: AlthaqalaynClient,
  query: string,
  mediaFilter?: MediaType,
): Promise<Lecture[]> {
  let q = client.from("lectures").select("*");
  if (query.trim()) {
    const safe = escapePostgrestLike(query.trim());
    q = q.or(`title_en.ilike.%${safe}%,title_ha.ilike.%${safe}%`);
  }
  if (mediaFilter) q = q.eq("type", mediaFilter);
  const rows = unwrap<LectureRow[]>(await q.order("date", { ascending: false }));
  return rows.map(mapLecture);
}

// ── Gallery ──────────────────────────────────────────────────────────────────
export async function listAlbums(client: AlthaqalaynClient): Promise<Album[]> {
  const rows = unwrap<AlbumRow[]>(
    await client.from("albums").select("*").order("date", { ascending: false }),
  );
  return rows.map((r) => mapAlbum(r));
}

export async function getAlbumWithPhotos(
  client: AlthaqalaynClient,
  id: string,
): Promise<Album | null> {
  const albumRow = unwrap<AlbumRow | null>(
    await client.from("albums").select("*").eq("id", id).maybeSingle(),
  );
  if (!albumRow) return null;

  const photoRows = unwrap<PhotoRow[]>(
    await client.from("photos").select("*").eq("album_id", id).order("position"),
  );
  return mapAlbum(albumRow, photoRows.map(mapPhoto));
}

export async function getTranscript(
  client: AlthaqalaynClient,
  lectureId: string,
  language: Language,
): Promise<Transcript | null> {
  const row = unwrap<TranscriptRow | null>(
    await client
      .from("transcripts")
      .select("*")
      .eq("lecture_id", lectureId)
      .eq("language", language)
      .maybeSingle(),
  );
  return row ? mapTranscript(row) : null;
}
