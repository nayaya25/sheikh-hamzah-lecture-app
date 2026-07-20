"use client";

import { useCallback, useEffect, useState } from "react";
import {
  mapLecture,
  mapProgram,
  mapSeries,
  unwrap,
  type LectureRow,
  type ProgramRow,
  type SeriesRow,
} from "@althaqalayn/api";
import type { Lecture, Program, Series } from "@althaqalayn/types";
import { getClient } from "@/lib/supabase";

export interface SeriesNode extends Series {
  episodes: Lecture[];
}
export interface ProgramNode extends Program {
  seriesNodes: SeriesNode[];
}
export interface ContentTree {
  programs: ProgramNode[];
  orphanSeries: SeriesNode[];
  standalone: Lecture[];
}

/** Pure: fold flat rows into the Program → Series → Episode hierarchy. */
export function shapeTree(programs: Program[], series: Series[], lectures: Lecture[]): ContentTree {
  const episodesBySeries = new Map<string, Lecture[]>();
  const standalone: Lecture[] = [];
  for (const l of lectures) {
    if (l.seriesId) {
      const arr = episodesBySeries.get(l.seriesId) ?? [];
      arr.push(l);
      episodesBySeries.set(l.seriesId, arr);
    } else {
      standalone.push(l);
    }
  }
  for (const arr of episodesBySeries.values()) {
    arr.sort((a, b) => (a.episode ?? 0) - (b.episode ?? 0));
  }

  const seriesNodes: SeriesNode[] = series.map((s) => ({
    ...s,
    episodes: episodesBySeries.get(s.id) ?? [],
  }));
  const byProgram = new Map<string, SeriesNode[]>();
  const orphanSeries: SeriesNode[] = [];
  for (const sn of seriesNodes) {
    if (sn.programId) {
      const arr = byProgram.get(sn.programId) ?? [];
      arr.push(sn);
      byProgram.set(sn.programId, arr);
    } else {
      orphanSeries.push(sn);
    }
  }

  const programNodes: ProgramNode[] = programs.map((p) => ({
    ...p,
    seriesNodes: byProgram.get(p.id) ?? [],
  }));

  return { programs: programNodes, orphanSeries, standalone };
}

export function useContentTree() {
  const [tree, setTree] = useState<ContentTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const client = getClient();
    try {
      const [progs, sers, lecs] = await Promise.all([
        client.from("programs").select("*").order("created_at").then((r) => unwrap<ProgramRow[]>(r).map((row) => mapProgram(row))),
        client.from("series").select("*").order("position").then((r) => unwrap<SeriesRow[]>(r).map((row) => mapSeries(row))),
        client.from("lectures").select("*").order("date", { ascending: false }).then((r) => unwrap<LectureRow[]>(r).map((row) => mapLecture(row))),
      ]);
      setTree(shapeTree(progs, sers, lecs));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tree, loading, error, reload };
}
