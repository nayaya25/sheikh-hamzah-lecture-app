"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { admin, mapSeries, unwrap, type SeriesRow } from "@althaqalayn/api";
import type { Lecture, Series } from "@althaqalayn/types";
import { SelectField } from "@/components/fields";
import { ActionMenu } from "@/components/ActionMenu";
import { getClient } from "@/lib/supabase";
import { brand, coverGradient, font } from "@/lib/ui";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

/**
 * Curation for the app's Home screen: pick which lectures/series surface as
 * "featured", no free text. Persistence is unchanged — this still just flips
 * the existing `featured` boolean via `admin.upsertLecture`/`upsertSeries`.
 *
 * Series additionally support reordering because the `series` table has a
 * `position` column (`admin.setSeriesPositions`). Lectures have no equivalent
 * home-order column, so featured lectures are shown newest-first (the same
 * date order `admin.listAllLectures` already returns) and are NOT
 * reorderable — don't add drag/up-down controls for them.
 */
export function Featured() {
  const [series, setSeries] = useState<Series[] | null>(null);
  const [lectures, setLectures] = useState<Lecture[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addSeriesId, setAddSeriesId] = useState("");
  const [addLectureId, setAddLectureId] = useState("");

  const load = useCallback(async () => {
    try {
      const client = getClient();
      const [seriesRows, lecs] = await Promise.all([
        client
          .from("series")
          .select("*")
          .order("position")
          .then((r) => unwrap<SeriesRow[]>(r).map((row) => mapSeries(row))),
        admin.listAllLectures(client),
      ]);
      setSeries(seriesRows);
      setLectures(lecs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const featuredSeries = useMemo(() => (series ?? []).filter((s) => s.featured), [series]);
  const availableSeries = useMemo(() => (series ?? []).filter((s) => !s.featured), [series]);
  // No home-order column for lectures — order follows the date sort already
  // applied by admin.listAllLectures (newest first).
  const featuredLectures = useMemo(() => (lectures ?? []).filter((l) => l.featured), [lectures]);
  const availableLectures = useMemo(() => (lectures ?? []).filter((l) => !l.featured), [lectures]);

  const setSeriesFeatured = async (s: Series, featured: boolean) => {
    const { id, lectureIds, ...rest } = s;
    void lectureIds;
    setBusy(true);
    try {
      await admin.upsertSeries(getClient(), { ...rest, featured }, id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const setLectureFeatured = async (l: Lecture, featured: boolean) => {
    const { id, ...rest } = l;
    setBusy(true);
    try {
      await admin.upsertLecture(getClient(), { ...rest, featured }, id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  /** Swap two featured series' `position` values; visible order = position order. */
  const moveFeaturedSeries = async (s: Series, dir: -1 | 1) => {
    if (!series) return;
    const featuredIds = series.filter((x) => x.featured).map((x) => x.id);
    const i = featuredIds.indexOf(s.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= featuredIds.length) return;
    const otherId = featuredIds[j];
    const fullIds = series.map((x) => x.id);
    const ia = fullIds.indexOf(s.id);
    const ib = fullIds.indexOf(otherId);
    [fullIds[ia], fullIds[ib]] = [fullIds[ib], fullIds[ia]];
    setBusy(true);
    try {
      await admin.setSeriesPositions(getClient(), fullIds);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const addSeries = async () => {
    const s = availableSeries.find((x) => x.id === addSeriesId);
    if (!s) return;
    await setSeriesFeatured(s, true);
    setAddSeriesId("");
  };

  const addLecture = async () => {
    const l = availableLectures.find((x) => x.id === addLectureId);
    if (!l) return;
    await setLectureFeatured(l, true);
    setAddLectureId("");
  };

  if (error) return <div style={{ color: "var(--muted)" }}>Couldn’t load: {error}</div>;
  if (!series || !lectures) return <div style={{ color: "var(--muted)" }}>Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 30 }}>
      <section>
        <div style={styles.h2}>Featured lectures</div>
        <div style={styles.sub}>
          Picked lectures surface in the app’s Home “Featured” spot, newest first. Lectures have no
          dedicated home-order column, so this order isn’t independently adjustable — remove and
          re-add if you need a different one featured.
        </div>
        <div style={styles.card}>
          {featuredLectures.map((l) => (
            <div key={l.id} style={styles.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.title}>{pick(l.title)}</div>
                <div style={styles.meta}>{l.type.toUpperCase()} · {l.date}</div>
              </div>
              <ActionMenu
                items={[{ label: "Remove from Featured", onSelect: () => void setLectureFeatured(l, false), danger: true }]}
              />
            </div>
          ))}
          {featuredLectures.length === 0 ? <div style={styles.empty}>No featured lectures yet.</div> : null}
        </div>
        {availableLectures.length > 0 ? (
          <div style={styles.addRow}>
            <div style={{ flex: 1 }}>
              <SelectField
                label="Add a lecture"
                value={addLectureId}
                onChange={setAddLectureId}
                options={[
                  { value: "", label: "— Select a lecture —" },
                  ...availableLectures.map((l) => ({ value: l.id, label: pick(l.title) })),
                ]}
              />
            </div>
            <button type="button" disabled={!addLectureId || busy} onClick={() => void addLecture()} style={styles.addBtn}>
              Add
            </button>
          </div>
        ) : null}
      </section>

      <section>
        <div style={styles.h2}>Featured series</div>
        <div style={styles.sub}>Series picked here appear in the app’s Home “Featured series” rail, in this order.</div>
        <div style={styles.card}>
          {featuredSeries.map((s, i) => (
            <div key={s.id} style={styles.row}>
              <div style={{ ...styles.cover, background: coverGradient(s.cover.gradient[0], s.cover.gradient[1]) }}>
                <span style={styles.motif}>{s.cover.arabic}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.title}>{pick(s.title)}</div>
                <div style={styles.meta}>
                  {s.occasion ?? s.kind.toUpperCase()}
                  {s.year ? ` · ${s.year}` : ""}
                </div>
              </div>
              <div style={styles.reorder}>
                <button
                  type="button"
                  onClick={() => void moveFeaturedSeries(s, -1)}
                  disabled={i === 0 || busy}
                  style={styles.reorderBtn}
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => void moveFeaturedSeries(s, 1)}
                  disabled={i === featuredSeries.length - 1 || busy}
                  style={styles.reorderBtn}
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
              <ActionMenu
                items={[{ label: "Remove from Featured", onSelect: () => void setSeriesFeatured(s, false), danger: true }]}
              />
            </div>
          ))}
          {featuredSeries.length === 0 ? <div style={styles.empty}>No featured series yet.</div> : null}
        </div>
        {availableSeries.length > 0 ? (
          <div style={styles.addRow}>
            <div style={{ flex: 1 }}>
              <SelectField
                label="Add a series"
                value={addSeriesId}
                onChange={setAddSeriesId}
                options={[
                  { value: "", label: "— Select a series —" },
                  ...availableSeries.map((s) => ({ value: s.id, label: pick(s.title) })),
                ]}
              />
            </div>
            <button type="button" disabled={!addSeriesId || busy} onClick={() => void addSeries()} style={styles.addBtn}>
              Add
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  h2: { fontFamily: font.heading, fontSize: 15, fontWeight: 600 },
  sub: { fontSize: 12.5, color: "var(--muted)", margin: "6px 0 14px" },
  card: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" },
  empty: { padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 },
  row: { display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", borderBottom: "1px solid var(--line)" },
  cover: { width: 46, height: 46, borderRadius: 10, position: "relative", overflow: "hidden", flexShrink: 0 },
  motif: { position: "absolute", right: -2, top: -6, fontFamily: font.arabic, fontSize: 30, color: "rgba(255,255,255,.18)" },
  title: { fontSize: 14, fontWeight: 600 },
  meta: { fontSize: 11.5, color: "var(--muted)", marginTop: 2 },
  reorder: { display: "flex", flexDirection: "column", gap: 2 },
  reorderBtn: { background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 10, lineHeight: 1, padding: 2 },
  addRow: { display: "flex", alignItems: "flex-end", gap: 10, marginTop: 12 },
  addBtn: {
    background: brand.green,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "11px 18px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: font.ui,
    flexShrink: 0,
  },
};
