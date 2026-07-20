"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { admin, mapLecture, unwrap, type LectureRow } from "@althaqalayn/api";
import type { Lecture } from "@althaqalayn/types";
import { ActionMenu } from "@/components/ActionMenu";
import { LectureEditor } from "@/components/LectureEditor";
import { LectureView } from "@/components/LectureView";
import { getClient } from "@/lib/supabase";
import { brand, font, mediaBadge, statusPill } from "@/lib/ui";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

/** Lists the episodes (lectures) of a series, with edit/view/delete per episode. */
export function EpisodesDrawer({
  seriesId,
  seriesTitle,
  onClose,
  onChanged,
}: {
  seriesId: string;
  seriesTitle: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [episodes, setEpisodes] = useState<Lecture[] | null>(null);
  const [editing, setEditing] = useState<Lecture | null>(null);
  const [viewing, setViewing] = useState<Lecture | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await getClient()
        .from("lectures")
        .select("*")
        .eq("series_id", seriesId)
        .order("episode", { ascending: true, nullsFirst: false });
      setEpisodes(unwrap<LectureRow[]>(r).map((row) => mapLecture(row)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [seriesId]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (l: Lecture) => {
    if (!confirm(`Delete episode “${pick(l.title)}”?`)) return;
    await admin.deleteLecture(getClient(), l.id);
    await load();
    onChanged();
  };

  return (
    <>
      <div style={styles.scrim} onClick={onClose} />
      <div style={styles.drawer}>
        <div style={styles.header}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.h1}>Episodes</div>
            <div style={styles.sub}>{seriesTitle}</div>
          </div>
          <button onClick={onClose} style={styles.close} aria-label="Close">✕</button>
        </div>

        <div className="noscroll" style={styles.body}>
          {error ? <div style={styles.note}>Couldn’t load: {error}</div> : null}
          {!episodes && !error ? <div style={styles.note}>Loading…</div> : null}
          {episodes && episodes.length === 0 ? <div style={styles.note}>No episodes in this series yet.</div> : null}

          {episodes?.map((l) => {
            const badge = mediaBadge(l.type);
            const pill = statusPill(l.status);
            return (
              <div key={l.id} style={styles.row}>
                <div style={styles.num}>{l.episode ?? "•"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.title}>{pick(l.title)}</div>
                  <div style={styles.meta}>
                    <span style={{ ...styles.badge, background: badge.bg, color: badge.fg }}>{l.type.toUpperCase()}</span>
                    <span style={{ ...styles.pill, background: pill.bg, color: pill.fg }}>{pill.label}</span>
                  </div>
                </div>
                <ActionMenu
                  items={[
                    { label: "Edit", onSelect: () => setEditing(l) },
                    { label: "View", onSelect: () => setViewing(l) },
                    { label: "Delete", onSelect: () => void remove(l), danger: true },
                  ]}
                />
              </div>
            );
          })}
        </div>
      </div>

      {editing ? (
        <LectureEditor
          lecture={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
            onChanged();
          }}
        />
      ) : null}
      {viewing ? <LectureView lecture={viewing} seriesTitle={seriesTitle} onClose={() => setViewing(null)} /> : null}
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  scrim: { position: "fixed", inset: 0, zIndex: 50, background: "rgba(20,30,26,.4)" },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 51,
    width: 472,
    maxWidth: "100vw",
    background: "var(--card)",
    boxShadow: "-14px 0 40px rgba(0,0,0,.16)",
    display: "flex",
    flexDirection: "column",
  },
  header: { padding: "22px 24px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  h1: { fontFamily: font.heading, fontSize: 18, fontWeight: 600 },
  sub: { fontSize: 12, color: "var(--muted)", marginTop: 2 },
  close: { background: "transparent", border: "none", fontSize: 18, color: "var(--muted)", cursor: "pointer" },
  body: { flex: 1, overflowY: "auto", padding: 16 },
  note: { padding: 20, color: "var(--muted)", fontSize: 13, textAlign: "center" },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "12px 8px", borderBottom: "1px solid var(--line)" },
  num: { width: 30, height: 30, borderRadius: 8, background: "var(--chip)", color: brand.greenMid, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 },
  title: { fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  meta: { display: "flex", alignItems: "center", gap: 7, marginTop: 4 },
  badge: { fontSize: 9, fontWeight: 800, letterSpacing: ".5px", borderRadius: 5, padding: "3px 7px" },
  pill: { fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "3px 9px" },
};
