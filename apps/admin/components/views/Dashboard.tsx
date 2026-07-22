"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import type { Collection, Lecture } from "@althaqalayn/types";
import { getClient } from "@/lib/supabase";
import { brand, coverGradient, font, statusPill } from "@/lib/ui";
import type { View } from "@/lib/views";

const pick = (t: { en: string; ha?: string }) => t.en;

export function Dashboard({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [lectures, setLectures] = useState<Lecture[] | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getClient();
    void (async () => {
      try {
        const [lecs, cols] = await Promise.all([
          admin.listAllLectures(client),
          admin.listAllCollections(client),
        ]);
        setLectures(lecs);
        setCollections(cols);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, []);

  const collectionsById = new Map(collections.map((c) => [c.id, c]));
  const all = lectures ?? [];
  const published = all.filter((l) => l.status === "published");
  const scheduled = all.filter((l) => l.status === "scheduled");

  const stats = [
    { label: "Total lectures", value: all.length, dot: brand.greenMid, delta: `${published.length} published` },
    { label: "Collections", value: collections.length, dot: "#2c7396", delta: "Across the archive" },
    { label: "Published", value: published.length, dot: "#12634E", delta: "Live in the app" },
    { label: "Scheduled", value: scheduled.length, dot: "#9a7420", delta: "Auto-publishing" },
  ];

  const recent = all.slice(0, 5);

  if (error) return <div style={styles.notice}>Couldn’t load dashboard: {error}</div>;
  if (!lectures) return <div style={styles.notice}>Loading…</div>;

  return (
    <div>
      <div style={styles.statGrid}>
        {stats.map((s) => (
          <div key={s.label} style={styles.card}>
            <div style={styles.statHead}>
              <span style={styles.statLabel}>{s.label}</span>
              <span style={{ ...styles.dot, background: s.dot }} />
            </div>
            <div style={styles.statValue}>{s.value}</div>
            <div style={styles.statDelta}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div style={styles.lower}>
        <div style={styles.card}>
          <div style={styles.rowBetween}>
            <div style={styles.h2}>Recent uploads</div>
            <span onClick={() => onNavigate("content")} style={styles.link}>
              View all
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            {recent.length === 0 ? (
              <div style={styles.emptyRow}>No lectures yet — create one to get started.</div>
            ) : (
              recent.map((l) => {
                const c = collectionsById.get(l.collectionId);
                const pill = statusPill(l.status);
                return (
                  <div key={l.id} style={styles.recentRow}>
                    <div style={{ ...styles.thumb, background: coverGradient(c?.cover.gradient[0], c?.cover.gradient[1]) }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.recentTitle}>{pick(l.title)}</div>
                      <div style={styles.recentSub}>{c ? pick(c.title) : (l.year ?? "—")}</div>
                    </div>
                    <span style={{ ...styles.pill, background: pill.bg, color: pill.fg }}>{pill.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={styles.scheduledCard}>
          <div style={styles.scheduledWatermark}>مولد</div>
          <div style={styles.h2White}>Scheduled</div>
          <div style={styles.scheduledSub}>Auto-publishing queue</div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {scheduled.length === 0 ? (
              <div style={styles.scheduledEmpty}>Nothing scheduled.</div>
            ) : (
              scheduled.slice(0, 3).map((l) => (
                <div key={l.id} style={styles.scheduledItem}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{pick(l.title)}</div>
                  <div style={{ fontSize: 11, color: brand.gold, marginTop: 3 }}>
                    {l.scheduledFor ? new Date(l.scheduledFor).toLocaleString() : "Scheduled"}
                  </div>
                </div>
              ))
            )}
          </div>
          <button onClick={() => onNavigate("content")} style={styles.scheduledBtn}>
            Manage schedule
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  notice: { color: "var(--muted)", fontSize: 14, padding: 8 },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  card: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 18 },
  statHead: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  statLabel: { fontSize: 12, color: "var(--muted)" },
  dot: { width: 8, height: 8, borderRadius: "50%" },
  statValue: { fontFamily: font.heading, fontSize: 28, fontWeight: 600, marginTop: 8 },
  statDelta: { fontSize: 11.5, color: brand.greenMid, marginTop: 4 },

  lower: { display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginTop: 16 },
  rowBetween: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  h2: { fontFamily: font.heading, fontSize: 16, fontWeight: 600 },
  link: { fontSize: 12, fontWeight: 700, color: brand.greenMid, cursor: "pointer" },
  emptyRow: { fontSize: 13, color: "var(--muted)", padding: "12px 0" },
  recentRow: { display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: "1px solid var(--line)" },
  thumb: { width: 38, height: 38, borderRadius: 9, flexShrink: 0 },
  recentTitle: { fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  recentSub: { fontSize: 11, color: "var(--muted)" },
  pill: { fontSize: 10.5, fontWeight: 800, borderRadius: 20, padding: "4px 11px" },

  scheduledCard: {
    background: `linear-gradient(160deg, ${brand.green}, #0f5a45)`,
    borderRadius: 16,
    padding: 20,
    color: "#fff",
    position: "relative",
    overflow: "hidden",
  },
  scheduledWatermark: {
    position: "absolute",
    right: -14,
    top: -14,
    fontFamily: font.arabic,
    fontSize: 90,
    color: "rgba(255,255,255,.07)",
  },
  h2White: { fontFamily: font.heading, fontSize: 16, fontWeight: 600 },
  scheduledSub: { fontSize: 12, color: "rgba(255,255,255,.7)", marginTop: 4 },
  scheduledEmpty: { fontSize: 12.5, color: "rgba(255,255,255,.7)" },
  scheduledItem: { background: "rgba(255,255,255,.1)", borderRadius: 11, padding: 12 },
  scheduledBtn: {
    marginTop: 16,
    width: "100%",
    textAlign: "center",
    background: "rgba(255,255,255,.14)",
    border: "1px solid rgba(255,255,255,.24)",
    color: "#fff",
    borderRadius: 10,
    padding: 10,
    fontSize: 12.5,
    fontWeight: 700,
    fontFamily: font.ui,
    cursor: "pointer",
  },
};
