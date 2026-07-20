"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  admin,
  mapProgram,
  mapSeries,
  unwrap,
  type ProgramRow,
  type SeriesRow,
} from "@althaqalayn/api";
import type { Program, Series } from "@althaqalayn/types";
import { EpisodesDrawer } from "@/components/EpisodesDrawer";
import { ProgramEditor } from "@/components/ProgramEditor";
import { SeriesEditor } from "@/components/SeriesEditor";
import { getClient } from "@/lib/supabase";
import { brand, coverGradient, font } from "@/lib/ui";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

export function SeriesManager({ query }: { query: string }) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [programEditing, setProgramEditing] = useState<Program | "new" | null>(null);
  const [seriesEditing, setSeriesEditing] = useState<Series | "new" | null>(null);
  const [episodesFor, setEpisodesFor] = useState<Series | null>(null);

  const load = useCallback(async () => {
    const client = getClient();
    try {
      const [progs, sers, lecs] = await Promise.all([
        client.from("programs").select("*").order("created_at").then((r) => unwrap<ProgramRow[]>(r).map((row) => mapProgram(row))),
        client.from("series").select("*").order("position").then((r) => unwrap<SeriesRow[]>(r).map((row) => mapSeries(row))),
        client.from("lectures").select("series_id").then((r) => unwrap<{ series_id: string | null }[]>(r)),
      ]);
      const c: Record<string, number> = {};
      for (const l of lecs) if (l.series_id) c[l.series_id] = (c[l.series_id] ?? 0) + 1;
      setPrograms(progs);
      setSeries(sers);
      setCounts(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const seriesShown = useMemo(
    () => series.filter((s) => !q || `${pick(s.title)} ${s.kind}`.toLowerCase().includes(q)),
    [series, q],
  );
  const seriesPerProgram = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of series) if (s.programId) m[s.programId] = (m[s.programId] ?? 0) + 1;
    return m;
  }, [series]);

  const onSaved = () => {
    setProgramEditing(null);
    setSeriesEditing(null);
    void load();
  };

  const removeProgram = async (p: Program) => {
    if (!confirm(`Delete program “${pick(p.title)}”? Its series are kept but unlinked.`)) return;
    await admin.deleteProgram(getClient(), p.id);
    void load();
  };
  const removeSeries = async (s: Series) => {
    if (!confirm(`Delete series “${pick(s.title)}”? Its lectures are kept but unlinked.`)) return;
    await admin.deleteSeries(getClient(), s.id);
    void load();
  };

  if (loading) return <div style={{ color: "var(--muted)" }}>Loading…</div>;
  if (error) return <div style={{ color: "var(--muted)" }}>Couldn’t load: {error}</div>;

  return (
    <div>
      {/* Programs */}
      <div style={styles.sectionHead}>
        <div style={styles.h2}>Programs / collections</div>
        <button onClick={() => setProgramEditing("new")} style={styles.newBtn}>+ New program</button>
      </div>
      <div style={styles.card}>
        {programs.length === 0 ? (
          <div style={styles.empty}>No programs yet.</div>
        ) : (
          programs.map((p) => (
            <div key={p.id} style={styles.progRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.progTitle}>{pick(p.title)}</div>
                <div style={styles.progMeta}>{seriesPerProgram[p.id] ?? 0} series</div>
              </div>
              <button onClick={() => setProgramEditing(p)} style={styles.linkBtn}>Edit</button>
              <button onClick={() => void removeProgram(p)} style={styles.linkMuted}>Delete</button>
            </div>
          ))
        )}
      </div>

      {/* Series */}
      <div style={{ ...styles.sectionHead, marginTop: 28 }}>
        <div style={styles.h2}>Series</div>
        <button onClick={() => setSeriesEditing("new")} style={styles.newBtn}>+ New series</button>
      </div>
      {seriesShown.length === 0 ? (
        <div style={styles.card}>
          <div style={styles.empty}>No series{q ? " match your search" : " yet"}.</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {seriesShown.map((s) => (
            <div key={s.id} style={styles.seriesCard}>
              <div style={{ ...styles.cover, background: coverGradient(s.cover.gradient[0], s.cover.gradient[1]) }}>
                <span style={styles.motif}>{s.cover.arabic}</span>
                <span style={styles.kindChip}>{s.occasion ?? s.kind.toUpperCase()}</span>
                {s.featured ? <span style={styles.star}>★</span> : null}
              </div>
              <div style={styles.seriesTitle}>{pick(s.title)}</div>
              <div style={styles.seriesMeta}>
                {(counts[s.id] ?? 0)} parts · {s.language === "ha" ? "Hausa" : "English"}
                {s.year ? ` · ${s.year}` : ""}
              </div>
              <div style={styles.cardActions}>
                <button onClick={() => setEpisodesFor(s)} style={styles.linkBtn}>Episodes</button>
                <button onClick={() => setSeriesEditing(s)} style={styles.linkBtn}>Edit</button>
                <button onClick={() => void removeSeries(s)} style={styles.linkMuted}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {programEditing !== null ? (
        <ProgramEditor program={programEditing === "new" ? null : programEditing} onClose={() => setProgramEditing(null)} onSaved={onSaved} />
      ) : null}
      {seriesEditing !== null ? (
        <SeriesEditor
          series={seriesEditing === "new" ? null : seriesEditing}
          programs={programs.map((p) => [p.id, pick(p.title)] as [string, string])}
          onClose={() => setSeriesEditing(null)}
          onSaved={onSaved}
        />
      ) : null}
      {episodesFor ? (
        <EpisodesDrawer
          seriesId={episodesFor.id}
          seriesTitle={pick(episodesFor.title)}
          onClose={() => setEpisodesFor(null)}
          onChanged={() => void load()}
        />
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  h2: { fontFamily: font.heading, fontSize: 15, fontWeight: 600 },
  newBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: brand.green,
    color: "#fff",
    border: "none",
    borderRadius: 9,
    padding: "9px 15px",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: font.ui,
  },
  card: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" },
  empty: { padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 },
  progRow: { display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: "1px solid var(--line)" },
  progTitle: { fontSize: 14, fontWeight: 600 },
  progMeta: { fontSize: 11.5, color: "var(--muted)", marginTop: 2 },
  linkBtn: { background: "transparent", border: "none", fontSize: 12, fontWeight: 700, color: brand.greenMid, cursor: "pointer" },
  linkMuted: { background: "transparent", border: "none", fontSize: 12, fontWeight: 700, color: "var(--muted)", cursor: "pointer" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 },
  seriesCard: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 },
  cover: { height: 96, borderRadius: 12, position: "relative", overflow: "hidden", display: "flex", alignItems: "flex-end", padding: 10 },
  motif: { position: "absolute", right: -4, top: -10, fontFamily: font.arabic, fontSize: 56, color: "rgba(255,255,255,.15)" },
  kindChip: { position: "relative", fontSize: 9, fontWeight: 800, letterSpacing: ".5px", color: "#fff", background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.28)", borderRadius: 20, padding: "3px 9px" },
  star: { position: "absolute", left: 10, top: 8, color: brand.gold, fontSize: 14 },
  seriesTitle: { fontFamily: font.heading, fontSize: 14, fontWeight: 600, marginTop: 10 },
  seriesMeta: { fontSize: 11.5, color: "var(--muted)", marginTop: 3 },
  cardActions: { display: "flex", gap: 14, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" },
};
