// Real catalog data from Supabase — series, lectures, categories, albums, and
// the derived Home rails. No bundled sample content; screens render loading and
// empty states from what this returns.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  mapCategory,
  mapLecture,
  mapSeries,
  unwrap,
  type CategoryRow,
  type LectureRow,
  type SeriesRow,
} from "@althaqalayn/api";
import type { Category, Language, Lecture, LocalizedText, Series } from "@althaqalayn/types";
import type { Playable, SampleSeries } from "@/lib/catalog";
import { getClient, isBackendConfigured } from "@/lib/supabase";
import type { Gradient, HomeAlbum, HomeCategory, HomeLecture, HomeSeries } from "@/lib/sampleData";

const DEFAULT_GRADIENT: Gradient = ["#0B4634", "#17795E"];

interface CatalogValue {
  loading: boolean;
  configured: boolean;
  series: SampleSeries[];
  lectures: Playable[];
  categories: HomeCategory[];
  albums: HomeAlbum[];
  homeFeatured: HomeSeries[];
  homeLatest: HomeLecture[];
  seriesById: (id: string) => SampleSeries | undefined;
  lectureById: (id: string) => Playable | undefined;
  episodesForSeries: (series: SampleSeries) => Playable[];
  gradientForLecture: (p: Playable) => Gradient;
}

const CatalogContext = createContext<CatalogValue | null>(null);

const pick = (t?: LocalizedText): string => t?.en ?? t?.ha ?? "";
const langLabel = (l: Language): string => (l === "ha" ? "Hausa" : "English");

function mediaLabel(lectures: Playable[]): string {
  const types = new Set(lectures.map((l) => l.type));
  return (
    [types.has("video") && "Video", types.has("audio") && "Audio", types.has("text") && "Text"]
      .filter(Boolean)
      .join(" & ") || "Audio"
  );
}

function toSampleSeries(s: Series, own: Playable[]): SampleSeries {
  return {
    id: s.id,
    kind: (s.occasion ?? s.kind).toUpperCase(),
    kindRaw: s.kind,
    title: pick(s.title),
    ar: s.cover.arabic ?? "",
    year: s.year ?? "",
    count: own.length || s.lectureIds.length,
    media: mediaLabel(own),
    lang: langLabel(s.language),
    gradient: s.cover.gradient,
    desc: pick(s.description),
  };
}

function toPlayable(l: Lecture, series?: Series): Playable {
  return {
    id: l.id,
    title: pick(l.title),
    sub: series ? `${pick(series.title)}${l.episode ? ` · Part ${l.episode}` : ""}` : (l.year ?? ""),
    seriesId: l.seriesId ?? "",
    type: l.type,
    durSec: l.duration ?? 0,
    ar: series?.cover.arabic ?? "",
    episode: l.episode,
    mediaUrl: l.mediaUrl,
    gradient: series?.cover.gradient,
    seriesTitle: series ? pick(series.title) : undefined,
  };
}

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
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
  const [series, setSeries] = useState<SampleSeries[]>([]);
  const [lectures, setLectures] = useState<Playable[]>([]);
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [albums, setAlbums] = useState<HomeAlbum[]>([]);
  const [homeFeatured, setHomeFeatured] = useState<HomeSeries[]>([]);
  const [homeLatest, setHomeLatest] = useState<HomeLecture[]>([]);

  useEffect(() => {
    const client = getClient();
    if (!client) return;
    let cancelled = false;

    void (async () => {
      try {
        const [seriesRows, lectureRows, categoryRows, albumRows] = await Promise.all([
          client.from("series").select("*").order("position").then((r) => unwrap<SeriesRow[]>(r)),
          client.from("lectures").select("*").order("date", { ascending: false }).then((r) => unwrap<LectureRow[]>(r)),
          client.from("categories").select("*").order("position").then((r) => unwrap<CategoryRow[]>(r)),
          client.from("albums").select("id,title,date,photos(url)").order("date", { ascending: false }).then((r) => unwrap<AlbumWithPhotos[]>(r)),
        ]);
        if (cancelled) return;

        const domainSeries = seriesRows.map((row) => mapSeries(row));
        const domainLectures = lectureRows.map((row) => mapLecture(row));
        const seriesMap = new Map(domainSeries.map((s) => [s.id, s]));

        const playables = domainLectures.map((l) =>
          toPlayable(l, l.seriesId ? seriesMap.get(l.seriesId) : undefined),
        );
        const bySeries = new Map<string, Playable[]>();
        for (const p of playables) {
          if (!p.seriesId) continue;
          const arr = bySeries.get(p.seriesId) ?? [];
          arr.push(p);
          bySeries.set(p.seriesId, arr);
        }

        setSeries(domainSeries.map((s) => toSampleSeries(s, bySeries.get(s.id) ?? [])));
        setLectures(playables);
        setCategories(
          categoryRows
            .map((row) => mapCategory(row))
            .filter((c: Category) => c.active && !c.archived)
            .map((c): HomeCategory => ({ ar: c.ar, label: c.label, meta: c.meta ?? "" })),
        );
        setAlbums(
          albumRows.map((a): HomeAlbum => ({
            id: a.id,
            title: a.title,
            date: a.date,
            count: a.photos.length,
            cover: a.photos[0]?.url,
          })),
        );
        setHomeFeatured(
          domainSeries
            .filter((s) => s.featured)
            .map((s): HomeSeries => {
              const vm = toSampleSeries(s, bySeries.get(s.id) ?? []);
              return { id: vm.id, kind: vm.kind, title: vm.title, ar: vm.ar, metaShort: `${vm.count} parts · ${vm.lang}`, gradient: vm.gradient };
            }),
        );
        setHomeLatest(
          domainLectures.slice(0, 6).map((l): HomeLecture => {
            const s = l.seriesId ? seriesMap.get(l.seriesId) : undefined;
            return {
              id: l.id,
              title: pick(l.title),
              sub: s ? pick(s.title) : (l.year ?? ""),
              type: l.type,
              date: relativeDate(l.date),
              ar: s?.cover.arabic ?? "",
              gradient: s?.cover.gradient ?? DEFAULT_GRADIENT,
            };
          }),
        );
      } catch {
        // leave empty → screens show empty states
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<CatalogValue>(() => {
    const byId = new Map(series.map((s) => [s.id, s]));
    const lecById = new Map(lectures.map((l) => [l.id, l]));
    const episodes = new Map<string, Playable[]>();
    for (const l of lectures) {
      if (!l.seriesId) continue;
      const arr = episodes.get(l.seriesId) ?? [];
      arr.push(l);
      episodes.set(l.seriesId, arr);
    }
    return {
      loading,
      configured,
      series,
      lectures,
      categories,
      albums,
      homeFeatured,
      homeLatest,
      seriesById: (id) => byId.get(id),
      lectureById: (id) => lecById.get(id),
      episodesForSeries: (s) => episodes.get(s.id) ?? [],
      gradientForLecture: (p) => p.gradient ?? byId.get(p.seriesId)?.gradient ?? DEFAULT_GRADIENT,
    };
  }, [loading, configured, series, lectures, categories, albums, homeFeatured, homeLatest]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within a CatalogProvider");
  return ctx;
}
