"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import type { Collection, Lecture } from "@althaqalayn/types";
import { SelectField } from "@/components/fields";
import { ActionMenu } from "@/components/ActionMenu";
import { getClient } from "@/lib/supabase";
import { brand, coverGradient, font } from "@/lib/ui";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

/**
 * Curation for the app's Home screen: pick which lectures/collections surface
 * as "featured", no free text. Persistence is unchanged — this still just
 * flips the existing `featured` boolean via
 * `admin.upsertLecture`/`admin.upsertCollection`.
 *
 * Collections additionally support reordering because the `collections` table
 * has a `position` column (`admin.setCollectionPositions`). Lectures have no
 * equivalent home-order column, so featured lectures are shown newest-first
 * (the same date order `admin.listAllLectures` already returns) and are NOT
 * reorderable — don't add drag/up-down controls for them.
 */
export function Featured() {
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [lectures, setLectures] = useState<Lecture[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addCollectionId, setAddCollectionId] = useState("");
  const [addLectureId, setAddLectureId] = useState("");

  const load = useCallback(async () => {
    try {
      const client = getClient();
      const [cols, lecs] = await Promise.all([admin.listAllCollections(client), admin.listAllLectures(client)]);
      setCollections(cols);
      setLectures(lecs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const featuredCollections = useMemo(() => (collections ?? []).filter((c) => c.featured), [collections]);
  const availableCollections = useMemo(() => (collections ?? []).filter((c) => !c.featured), [collections]);
  // No home-order column for lectures — order follows the date sort already
  // applied by admin.listAllLectures (newest first).
  const featuredLectures = useMemo(() => (lectures ?? []).filter((l) => l.featured), [lectures]);
  const availableLectures = useMemo(() => (lectures ?? []).filter((l) => !l.featured), [lectures]);

  const setCollectionFeatured = async (c: Collection, featured: boolean) => {
    const { id, ...rest } = c;
    setBusy(true);
    try {
      await admin.upsertCollection(getClient(), { ...rest, featured }, id);
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

  /** Swap two featured collections' `position` values; visible order = position order. */
  const moveFeaturedCollection = async (c: Collection, dir: -1 | 1) => {
    if (!collections) return;
    const featuredIds = collections.filter((x) => x.featured).map((x) => x.id);
    const i = featuredIds.indexOf(c.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= featuredIds.length) return;
    const otherId = featuredIds[j];
    const fullIds = collections.map((x) => x.id);
    const ia = fullIds.indexOf(c.id);
    const ib = fullIds.indexOf(otherId);
    [fullIds[ia], fullIds[ib]] = [fullIds[ib], fullIds[ia]];
    setBusy(true);
    try {
      await admin.setCollectionPositions(getClient(), fullIds);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const addCollection = async () => {
    const c = availableCollections.find((x) => x.id === addCollectionId);
    if (!c) return;
    await setCollectionFeatured(c, true);
    setAddCollectionId("");
  };

  const addLecture = async () => {
    const l = availableLectures.find((x) => x.id === addLectureId);
    if (!l) return;
    await setLectureFeatured(l, true);
    setAddLectureId("");
  };

  if (error) return <div style={{ color: "var(--muted)" }}>Couldn’t load: {error}</div>;
  if (!collections || !lectures) return <div style={{ color: "var(--muted)" }}>Loading…</div>;

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
        <div style={styles.h2}>Featured collections</div>
        <div style={styles.sub}>Collections picked here appear in the app’s Home “Featured” rail, in this order.</div>
        <div style={styles.card}>
          {featuredCollections.map((c, i) => (
            <div key={c.id} style={styles.row}>
              <div style={{ ...styles.cover, background: coverGradient(c.cover.gradient[0], c.cover.gradient[1]) }}>
                <span style={styles.motif}>{c.cover.arabic}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.title}>{pick(c.title)}</div>
                <div style={styles.meta}>{c.kind.toUpperCase()}</div>
              </div>
              <div style={styles.reorder}>
                <button
                  type="button"
                  onClick={() => void moveFeaturedCollection(c, -1)}
                  disabled={i === 0 || busy}
                  style={styles.reorderBtn}
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => void moveFeaturedCollection(c, 1)}
                  disabled={i === featuredCollections.length - 1 || busy}
                  style={styles.reorderBtn}
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
              <ActionMenu
                items={[{ label: "Remove from Featured", onSelect: () => void setCollectionFeatured(c, false), danger: true }]}
              />
            </div>
          ))}
          {featuredCollections.length === 0 ? <div style={styles.empty}>No featured collections yet.</div> : null}
        </div>
        {availableCollections.length > 0 ? (
          <div style={styles.addRow}>
            <div style={{ flex: 1 }}>
              <SelectField
                label="Add a collection"
                value={addCollectionId}
                onChange={setAddCollectionId}
                options={[
                  { value: "", label: "— Select a collection —" },
                  ...availableCollections.map((c) => ({ value: c.id, label: pick(c.title) })),
                ]}
              />
            </div>
            <button type="button" disabled={!addCollectionId || busy} onClick={() => void addCollection()} style={styles.addBtn}>
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
