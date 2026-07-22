// Real catalog data from Supabase — collections, lectures, and albums, plus
// the derived Home rails. No bundled sample content; screens render loading
// and empty states from what this returns.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  mapCollection,
  mapLecture,
  unwrap,
  type CollectionRow,
  type LectureRow,
} from "@althaqalayn/api";
import type { Collection, Lecture, LocalizedText } from "@althaqalayn/types";
import { groupLectures, type CollectionVM, type LectureGroup, type Playable } from "@/lib/catalog";
import { getClient, isBackendConfigured } from "@/lib/supabase";
import type { HomeAlbum } from "@/lib/sampleData";

interface CatalogValue {
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  configured: boolean;
  collections: CollectionVM[];
  lectures: Playable[];
  albums: HomeAlbum[];
  /** Home "Featured" shelf. */
  featuredCollections: CollectionVM[];
  /** Home "Latest lectures" list. */
  latestLectures: Playable[];
  /** Home "Featured lectures" shelf — published lectures with `featured: true`, newest first. */
  featuredLectures: Playable[];
  collectionById: (id: string) => CollectionVM | undefined;
  lectureById: (id: string) => Playable | undefined;
  /** A collection's lectures — flat and `sort`-ordered for `series`, grouped
   *  by `groupLabel` for `occasion`/`topic` (see `groupLectures`). */
  lecturesForCollection: (id: string) => Playable[] | LectureGroup[];
}

const CatalogContext = createContext<CatalogValue | null>(null);

const pick = (t?: LocalizedText): string => t?.en ?? t?.ha ?? "";

function toCollectionVM(c: Collection, count: number): CollectionVM {
  return {
    id: c.id,
    title: pick(c.title),
    kind: c.kind,
    language: c.language,
    cover: { gradient: c.cover.gradient, arabic: c.cover.arabic },
    description: pick(c.description) || undefined,
    count,
    featured: c.featured,
    position: c.position,
  };
}

function toPlayable(l: Lecture, collection?: Collection): Playable {
  return {
    id: l.id,
    title: pick(l.title),
    sub: collection ? pick(collection.title) : (l.year ?? ""),
    collectionId: l.collectionId,
    type: l.type,
    durSec: l.duration ?? 0,
    ar: collection?.cover.arabic ?? "",
    groupLabel: l.groupLabel,
    sort: l.sort,
    mediaUrl: l.mediaUrl,
    gradient: collection?.cover.gradient,
    collectionTitle: collection ? pick(collection.title) : undefined,
    featured: l.featured,
  };
}

interface AlbumWithPhotos {
  id: string;
  title: string;
  date: string;
  photos: { url: string }[];
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const configured = isBackendConfigured();
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionVM[]>([]);
  const [lectures, setLectures] = useState<Playable[]>([]);
  const [albums, setAlbums] = useState<HomeAlbum[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const client = getClient();
    if (!client) return;
    setLoading(true);

    try {
      const [collectionRows, lectureRows, albumRows] = await Promise.all([
        client.from("collections").select("*").order("position").then((r) => unwrap<CollectionRow[]>(r)),
        client.from("lectures").select("*").order("date", { ascending: false }).then((r) => unwrap<LectureRow[]>(r)),
        client.from("albums").select("id,title,date,photos(url)").order("date", { ascending: false }).then((r) => unwrap<AlbumWithPhotos[]>(r)),
      ]);
      if (!mountedRef.current) return;

      const domainCollections = collectionRows.map((row) => mapCollection(row));
      const domainLectures = lectureRows.map((row) => mapLecture(row));
      const collectionMap = new Map(domainCollections.map((c) => [c.id, c]));

      const playables = domainLectures.map((l) => toPlayable(l, collectionMap.get(l.collectionId)));
      const byCollection = new Map<string, Playable[]>();
      for (const p of playables) {
        const arr = byCollection.get(p.collectionId) ?? [];
        arr.push(p);
        byCollection.set(p.collectionId, arr);
      }

      setCollections(domainCollections.map((c) => toCollectionVM(c, byCollection.get(c.id)?.length ?? 0)));
      setLectures(playables);
      setAlbums(
        albumRows.map((a): HomeAlbum => ({
          id: a.id,
          title: a.title,
          date: a.date,
          count: a.photos.length,
          cover: a.photos[0]?.url,
        })),
      );
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to load");
      // leave existing data in place → screens fall back to empty states
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<CatalogValue>(() => {
    const collectionMap = new Map(collections.map((c) => [c.id, c]));
    const lectureMap = new Map(lectures.map((l) => [l.id, l]));

    // `lectures` is already date-ordered from the query; group per collection
    // and keep each group `sort`-ordered for `lecturesForCollection`.
    const byCollection = new Map<string, Playable[]>();
    for (const l of lectures) {
      const arr = byCollection.get(l.collectionId) ?? [];
      arr.push(l);
      byCollection.set(l.collectionId, arr);
    }
    for (const arr of byCollection.values()) {
      arr.sort((a, b) => a.sort - b.sort);
    }

    return {
      loading,
      error,
      refetch: load,
      configured,
      collections,
      lectures,
      albums,
      featuredCollections: collections.filter((c) => c.featured),
      latestLectures: lectures.slice(0, 6),
      // `lectures` is already date-desc ordered from the query, same as `latestLectures`.
      featuredLectures: lectures.filter((l) => l.featured).slice(0, 10),
      collectionById: (id) => collectionMap.get(id),
      lectureById: (id) => lectureMap.get(id),
      lecturesForCollection: (id) => {
        const collection = collectionMap.get(id);
        if (!collection) return [];
        return groupLectures(collection.kind, byCollection.get(id) ?? []);
      },
    };
  }, [loading, error, load, configured, collections, lectures, albums]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within a CatalogProvider");
  return ctx;
}
