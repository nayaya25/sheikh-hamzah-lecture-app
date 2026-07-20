"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { admin, mapSeries, unwrap, type SeriesRow } from "@althaqalayn/api";
import type { Lecture, PublishStatus, Series } from "@althaqalayn/types";
import { getClient } from "@/lib/supabase";
import { brand, coverGradient, font, mediaBadge, statusPill } from "@/lib/ui";
import { ActionMenu } from "@/components/ActionMenu";
import { LectureView } from "@/components/LectureView";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";
const FILTERS = ["All", "Published", "Draft", "Scheduled"] as const;
type Filter = (typeof FILTERS)[number];

const GRID = "2.4fr .9fr .9fr .8fr 1fr .9fr 40px";

export function Lectures({
  query,
  version,
  onEdit,
}: {
  query: string;
  version: number;
  onEdit: (lecture: Lecture) => void;
}) {
  const [lectures, setLectures] = useState<Lecture[] | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Lecture | null>(null);

  const load = useCallback(async () => {
    const client = getClient();
    try {
      const [lecs, sers] = await Promise.all([
        admin.listAllLectures(client),
        client.from("series").select("*").order("position").then((r) => unwrap<SeriesRow[]>(r).map((row) => mapSeries(row))),
      ]);
      setLectures(lecs);
      setSeries(sers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, version]);

  const removeLecture = async (l: Lecture) => {
    if (!confirm(`Delete “${pick(l.title)}”? This cannot be undone.`)) return;
    await admin.deleteLecture(getClient(), l.id);
    void load();
  };

  const seriesById = useMemo(() => new Map(series.map((s) => [s.id, s])), [series]);
  const q = query.trim().toLowerCase();

  const rows = useMemo(() => {
    return (lectures ?? []).filter((l) => {
      if (filter !== "All" && l.status !== (filter.toLowerCase() as PublishStatus)) return false;
      if (!q) return true;
      const s = l.seriesId ? seriesById.get(l.seriesId) : undefined;
      return `${pick(l.title)} ${s ? pick(s.title) : ""}`.toLowerCase().includes(q);
    });
  }, [lectures, filter, q, seriesById]);

  if (error) return <div style={{ color: "var(--muted)" }}>Couldn’t load: {error}</div>;
  if (!lectures) return <div style={{ color: "var(--muted)" }}>Loading…</div>;

  return (
    <div>
      <div style={styles.filters}>
        {FILTERS.map((f) => {
          const on = f === filter;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{ ...styles.chip, ...(on ? styles.chipOn : styles.chipOff) }}>
              {f}
            </button>
          );
        })}
      </div>

      <div style={styles.table}>
        <div style={{ ...styles.rowGrid, ...styles.head }}>
          <div>TITLE</div>
          <div>TYPE</div>
          <div>LANGUAGE</div>
          <div>LENGTH</div>
          <div>DATE</div>
          <div>STATUS</div>
          <div />
        </div>

        {rows.length === 0 ? (
          <div style={styles.empty}>No lectures{filter !== "All" ? ` with status “${filter}”` : ""}.</div>
        ) : (
          rows.map((l) => {
            const s = l.seriesId ? seriesById.get(l.seriesId) : undefined;
            const badge = mediaBadge(l.type);
            const pill = statusPill(l.status);
            return (
              <div key={l.id} onClick={() => onEdit(l)} style={{ ...styles.rowGrid, ...styles.row }}>
                <div style={styles.titleCell}>
                  <div style={{ ...styles.thumb, background: coverGradient(s?.cover.gradient[0], s?.cover.gradient[1]) }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.title}>{pick(l.title)}</div>
                    <div style={styles.sub}>
                      {s ? pick(s.title) : l.year ?? "Standalone"}
                      {l.episode ? ` · Part ${l.episode}` : ""}
                    </div>
                  </div>
                </div>
                <div>
                  <span style={{ ...styles.badge, background: badge.bg, color: badge.fg }}>{l.type.toUpperCase()}</span>
                </div>
                <div style={styles.muted}>{l.language === "ha" ? "Hausa" : "English"}</div>
                <div style={styles.muted}>{l.duration ? `${Math.round(l.duration / 60)} min` : "—"}</div>
                <div style={styles.muted}>{l.date}</div>
                <div>
                  <span style={{ ...styles.pill, background: pill.bg, color: pill.fg }}>{pill.label}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <ActionMenu
                    items={[
                      { label: "Edit", onSelect: () => onEdit(l) },
                      { label: "View", onSelect: () => setViewing(l) },
                      { label: "Delete", onSelect: () => void removeLecture(l), danger: true },
                    ]}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {viewing ? (
        <LectureView
          lecture={viewing}
          seriesTitle={viewing.seriesId ? pick(seriesById.get(viewing.seriesId)?.title) : undefined}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  filters: { display: "flex", gap: 8, marginBottom: 16 },
  chip: { borderRadius: 9, padding: "8px 15px", fontSize: 12.5, cursor: "pointer", fontFamily: font.ui },
  chipOn: { background: brand.green, color: "#fff", border: "none", fontWeight: 700 },
  chipOff: { background: "var(--card)", color: "var(--muted)", border: "1px solid var(--line)", fontWeight: 600 },
  table: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" },
  rowGrid: { display: "grid", gridTemplateColumns: GRID, gap: 10, padding: "13px 18px", alignItems: "center" },
  head: {
    background: "var(--chip)",
    borderBottom: "1px solid var(--line)",
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: ".5px",
    color: "var(--faint)",
  },
  row: { borderBottom: "1px solid var(--line)", cursor: "pointer", fontSize: 13 },
  titleCell: { display: "flex", alignItems: "center", gap: 11, minWidth: 0 },
  thumb: { width: 34, height: 34, borderRadius: 8, flexShrink: 0 },
  title: { fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  sub: { fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  muted: { color: "var(--muted)" },
  badge: { fontSize: 9, fontWeight: 800, letterSpacing: ".5px", borderRadius: 5, padding: "3px 7px" },
  pill: { fontSize: 10.5, fontWeight: 800, borderRadius: 20, padding: "4px 11px" },
  empty: { padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 },
};
