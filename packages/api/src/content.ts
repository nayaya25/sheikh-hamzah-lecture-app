// Public content reads for the mobile app. Every query is further constrained by
// RLS to published content, so these are safe even with the anon key.

import type {
  Album,
  Category,
  Lecture,
  Language,
  MediaType,
  Program,
  Series,
  Transcript,
} from "@althaqalayn/types";
import type { AlthaqalaynClient } from "./client";
import { unwrap } from "./client";
import type {
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
} from "./mappers";

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

export async function listFeaturedSeries(client: AlthaqalaynClient): Promise<Series[]> {
  const rows = unwrap<SeriesRow[]>(
    await client.from("series").select("*").eq("featured", true).order("position"),
  );
  return rows.map((r) => mapSeries(r));
}

/** A series plus its ordered episodes (Series detail screen). */
export async function getSeriesWithEpisodes(
  client: AlthaqalaynClient,
  id: string,
): Promise<{ series: Series; episodes: Lecture[] } | null> {
  const seriesRow = unwrap<SeriesRow | null>(
    await client.from("series").select("*").eq("id", id).maybeSingle(),
  );
  if (!seriesRow) return null;

  const episodeRows = unwrap<LectureRow[]>(
    await client
      .from("lectures")
      .select("*")
      .eq("series_id", id)
      .order("episode", { ascending: true, nullsFirst: false }),
  );
  const episodes = episodeRows.map(mapLecture);
  return { series: mapSeries(seriesRow, episodes.map((e) => e.id)), episodes };
}

/** A program plus its per-year series, ordered (Program screen). */
export async function getProgramWithSeries(
  client: AlthaqalaynClient,
  id: string,
): Promise<{ program: Program; series: Series[] } | null> {
  const programRow = unwrap<ProgramRow | null>(
    await client.from("programs").select("*").eq("id", id).maybeSingle(),
  );
  if (!programRow) return null;

  const seriesRows = unwrap<SeriesRow[]>(
    await client.from("series").select("*").eq("program_id", id).order("position"),
  );
  const series = seriesRows.map((r) => mapSeries(r));
  return { program: mapProgram(programRow, series.map((s) => s.id)), series };
}

/** Explore categories shown on Home (active, non-archived — also RLS-gated). */
export async function listCategories(client: AlthaqalaynClient): Promise<Category[]> {
  const rows = unwrap<CategoryRow[]>(
    await client.from("categories").select("*").order("position"),
  );
  return rows.map(mapCategory);
}

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
