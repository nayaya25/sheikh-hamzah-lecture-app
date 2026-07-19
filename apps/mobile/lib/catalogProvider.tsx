// Catalog data source. On mount, tries to load series + published lectures from
// Supabase; on success it maps the domain types to the app's view-models,
// otherwise it falls back to the sample catalog. Either way it exposes the same
// shapes the screens already use, so screens don't care where the data came from.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mapLecture, mapSeries, unwrap, type LectureRow, type SeriesRow } from "@althaqalayn/api";
import type { Language, Lecture, LocalizedText, Series } from "@althaqalayn/types";
import {
  episodesForSeries as syntheticEpisodes,
  gradientForLecture as sampleGradientFor,
  lecturesList,
  seriesList,
  type Playable,
  type SampleSeries,
} from "@/lib/catalog";
import { getClient } from "@/lib/supabase";
import {
  featuredSeries as sampleFeatured,
  latestLectures as sampleLatest,
  type Gradient,
  type HomeLecture,
  type HomeSeries,
} from "@/lib/sampleData";

const DEFAULT_GRADIENT: Gradient = ["#0B4634", "#17795E"];

interface CatalogValue {
  series: SampleSeries[];
  lectures: Playable[];
  homeFeatured: HomeSeries[];
  homeLatest: HomeLecture[];
  /** True once real backend data has replaced the sample fallback. */
  live: boolean;
  seriesById: (id: string) => SampleSeries | undefined;
  lectureById: (id: string) => Playable | undefined;
  episodesForSeries: (series: SampleSeries) => Playable[];
  gradientForLecture: (p: Playable) => Gradient;
}

const CatalogContext = createContext<CatalogValue | null>(null);

// ── domain → view-model mappers ──────────────────────────────────────────────
const pick = (t?: LocalizedText): string => t?.en ?? t?.ha ?? "";
const langLabel = (l: Language): string => (l === "ha" ? "Hausa" : "English");

function mediaLabel(lectures: Playable[]): string {
  const types = new Set(lectures.map((l) => l.type));
  const parts = [types.has("video") && "Video", types.has("audio") && "Audio", types.has("text") && "Text"].filter(
    Boolean,
  );
  return parts.join(" & ") || "Audio";
}

function toSampleSeries(s: Series, ownLectures: Playable[]): SampleSeries {
  return {
    id: s.id,
    kind: (s.occasion ?? s.kind).toUpperCase(),
    title: pick(s.title),
    ar: s.cover.arabic ?? "",
    year: s.year ?? "",
    count: s.lectureIds.length || ownLectures.length,
    media: mediaLabel(ownLectures),
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

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [series, setSeries] = useState<SampleSeries[]>(seriesList);
  const [lectures, setLectures] = useState<Playable[]>(lecturesList);
  const [homeFeatured, setHomeFeatured] = useState<HomeSeries[]>(sampleFeatured);
  const [homeLatest, setHomeLatest] = useState<HomeLecture[]>(sampleLatest);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const client = getClient();
    if (!client) return; // keep sample fallback

    let cancelled = false;
    void (async () => {
      try {
        const [seriesRows, lectureRows] = await Promise.all([
          client.from("series").select("*").order("position").then((r) => unwrap<SeriesRow[]>(r)),
          client.from("lectures").select("*").order("date", { ascending: false }).then((r) => unwrap<LectureRow[]>(r)),
        ]);
        if (cancelled || (seriesRows.length === 0 && lectureRows.length === 0)) return;

        const domainSeries = seriesRows.map((row) => mapSeries(row));
        const domainLectures = lectureRows.map((row) => mapLecture(row));
        const seriesByIdMap = new Map(domainSeries.map((s) => [s.id, s]));

        const playables = domainLectures.map((l) =>
          toPlayable(l, l.seriesId ? seriesByIdMap.get(l.seriesId) : undefined),
        );
        const bySeries = new Map<string, Playable[]>();
        playables.forEach((p) => {
          if (!p.seriesId) return;
          (bySeries.get(p.seriesId) ?? bySeries.set(p.seriesId, []).get(p.seriesId)!).push(p);
        });

        const mappedSeries = domainSeries.map((s) => toSampleSeries(s, bySeries.get(s.id) ?? []));

        const featured = domainSeries
          .filter((s) => s.featured)
          .map((s): HomeSeries => {
            const vm = toSampleSeries(s, bySeries.get(s.id) ?? []);
            return { id: vm.id, kind: vm.kind, title: vm.title, ar: vm.ar, metaShort: `${vm.count} parts · ${vm.lang}`, gradient: vm.gradient };
          });

        const latest = domainLectures.slice(0, 5).map((l): HomeLecture => {
          const s = l.seriesId ? seriesByIdMap.get(l.seriesId) : undefined;
          return {
            id: l.id,
            title: pick(l.title),
            sub: s ? pick(s.title) : (l.year ?? ""),
            type: l.type,
            date: relativeDate(l.date),
            ar: s?.cover.arabic ?? "",
            gradient: s?.cover.gradient ?? DEFAULT_GRADIENT,
          };
        });

        setSeries(mappedSeries);
        setLectures(playables);
        if (featured.length) setHomeFeatured(featured);
        if (latest.length) setHomeLatest(latest);
        setLive(true);
      } catch {
        // Network/permission error → stay on sample data.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<CatalogValue>(() => {
    const byId = new Map(series.map((s) => [s.id, s]));
    const lecById = new Map(lectures.map((l) => [l.id, l]));
    const episodesBySeries = new Map<string, Playable[]>();
    lectures.forEach((l) => {
      if (!l.seriesId) return;
      (episodesBySeries.get(l.seriesId) ?? episodesBySeries.set(l.seriesId, []).get(l.seriesId)!).push(l);
    });

    return {
      series,
      lectures,
      homeFeatured,
      homeLatest,
      live,
      seriesById: (id) => byId.get(id),
      lectureById: (id) => lecById.get(id),
      episodesForSeries: (s) => {
        const own = episodesBySeries.get(s.id);
        return own && own.length ? own : syntheticEpisodes(s);
      },
      gradientForLecture: (p) => p.gradient ?? byId.get(p.seriesId)?.gradient ?? sampleGradientFor(p),
    };
  }, [series, lectures, homeFeatured, homeLatest, live]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within a CatalogProvider");
  return ctx;
}
