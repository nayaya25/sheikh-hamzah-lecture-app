"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import type { Collection, Lecture } from "@althaqalayn/types";
import { getClient } from "@/lib/supabase";
import { brand, coverGradient, font, statusPill } from "@/lib/ui";
import { motion, radii } from "@/lib/tokens";
import type { View } from "@/lib/views";

const pick = (t: { en: string; ha?: string }) => t.en;

export function Dashboard({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [lectures, setLectures] = useState<Lecture[] | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

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
  const drafts = all.filter((l) => l.status === "draft");

  const stats = [
    { key: "total", label: "Total lectures", value: all.length, dot: brand.greenBright, delta: `${published.length} published`, view: "content" as View },
    { key: "collections", label: "Collections", value: collections.length, dot: brand.goldDk, delta: "Across the archive", view: "content" as View },
    { key: "drafts", label: "Drafts", value: drafts.length, dot: "#8b8b7e", delta: "Awaiting review", view: "content" as View },
    { key: "scheduled", label: "Scheduled", value: scheduled.length, dot: "#9a7420", delta: "Auto-publishing", view: "content" as View },
  ];

  const recent = all.slice(0, 6);

  if (error) return <div style={styles.notice}>Couldn’t load the dashboard: {error}</div>;
  if (!lectures) return <div style={styles.notice}>Loading…</div>;

  return (
    <div style={{ maxWidth: 1220 }}>
      {/* Greeting */}
      <header style={{ marginBottom: 26 }} className="rise">
        <div style={styles.eyebrow}>
          <span style={styles.eyebrowTick} />
          Overview
        </div>
        <h1 style={styles.greeting}>The archive at a glance</h1>
        <p style={styles.greetSub}>
          {all.length} lecture{all.length === 1 ? "" : "s"} across {collections.length} collection
          {collections.length === 1 ? "" : "s"}, preserved for the community.
        </p>
      </header>

      {/* Stat cards */}
      <div style={styles.statGrid}>
        {stats.map((s, i) => {
          const hot = hover === s.key;
          return (
            <button
              key={s.key}
              onClick={() => onNavigate(s.view)}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
              className="rise"
              style={{
                ...styles.statCard,
                animationDelay: `${i * 60}ms`,
                boxShadow: hot ? "var(--sh-2), var(--highlight)" : "var(--sh-1), var(--highlight)",
                transform: hot ? "translateY(-2px)" : "translateY(0)",
              }}
            >
              <div style={styles.statHead}>
                <span style={styles.statLabel}>{s.label}</span>
                <span style={{ ...styles.dot, background: s.dot }} />
              </div>
              <div style={styles.statValue} className="tnum">{s.value}</div>
              <div style={styles.statDelta}>{s.delta}</div>
            </button>
          );
        })}
      </div>

      {/* Lower split */}
      <div style={styles.lower}>
        {/* Recent uploads */}
        <div style={styles.card}>
          <div style={styles.rowBetween}>
            <div style={styles.h2}>Recent uploads</div>
            <button onClick={() => onNavigate("content")} style={styles.link}>
              View all →
            </button>
          </div>
          <div style={{ marginTop: 6 }}>
            {recent.length === 0 ? (
              <div style={styles.emptyRow}>No lectures yet — create one to get started.</div>
            ) : (
              recent.map((l, i) => {
                const c = collectionsById.get(l.collectionId);
                const pill = statusPill(l.status);
                return (
                  <div key={l.id} style={{ ...styles.recentRow, borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                    <div style={{ ...styles.thumbShell }}>
                      <div style={{ ...styles.thumb, background: coverGradient(c?.cover.gradient[0], c?.cover.gradient[1]) }}>
                        <span style={styles.thumbAr}>{c?.cover.arabic ?? "﷽"}</span>
                      </div>
                    </div>
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

        {/* Scheduled */}
        <div style={styles.scheduledCard}>
          <div style={styles.scheduledWatermark}>مولد</div>
          <div style={styles.scheduledEyebrow}>
            <span style={{ ...styles.eyebrowTick, background: brand.gold }} />
            Queue
          </div>
          <div style={styles.h2White}>Scheduled</div>
          <div style={styles.scheduledSub}>Lectures set to auto-publish</div>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            {scheduled.length === 0 ? (
              <div style={styles.scheduledEmpty}>Nothing scheduled right now.</div>
            ) : (
              scheduled.slice(0, 3).map((l) => (
                <div key={l.id} style={styles.scheduledItem}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{pick(l.title)}</div>
                  <div style={{ fontSize: 11.5, color: brand.gold, marginTop: 4 }} className="tnum">
                    {l.scheduledFor ? new Date(l.scheduledFor).toLocaleString() : "Scheduled"}
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => onNavigate("content")}
            style={styles.scheduledBtn}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Manage schedule
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  notice: { color: "var(--muted)", fontSize: 14, padding: 8 },

  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "var(--muted)",
  },
  eyebrowTick: { width: 16, height: 2, background: brand.goldDk, borderRadius: 2 },
  greeting: { fontFamily: font.arabic, fontSize: 34, fontWeight: 400, marginTop: 12, letterSpacing: "-0.01em", textWrap: "balance" },
  greetSub: { fontSize: 14.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.6 },

  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  statCard: {
    textAlign: "left",
    background: "var(--card)",
    border: "none",
    borderRadius: radii.lg,
    padding: 20,
    cursor: "pointer",
    boxShadow: "var(--sh-1), var(--highlight)",
    transition: `transform ${motion.base} ${motion.out}, box-shadow ${motion.base} ${motion.out}`,
  },
  statHead: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  statLabel: { fontSize: 12.5, color: "var(--muted)", fontWeight: 500 },
  dot: { width: 9, height: 9, borderRadius: "50%", boxShadow: "0 0 0 3px var(--chip)" },
  statValue: { fontFamily: font.heading, fontSize: 34, fontWeight: 600, marginTop: 14, letterSpacing: "-0.02em", lineHeight: 1 },
  statDelta: { fontSize: 12, color: "var(--muted)", marginTop: 8 },

  lower: { display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginTop: 16 },
  card: {
    background: "var(--card)",
    borderRadius: radii.lg,
    padding: 22,
    boxShadow: "var(--sh-1), var(--highlight)",
  },
  rowBetween: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  h2: { fontFamily: font.heading, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" },
  link: {
    fontSize: 12.5,
    fontWeight: 600,
    color: brand.greenMid,
    cursor: "pointer",
    background: "transparent",
    border: "none",
    fontFamily: font.ui,
  },
  emptyRow: { fontSize: 13.5, color: "var(--muted)", padding: "18px 0" },
  recentRow: { display: "flex", alignItems: "center", gap: 14, padding: "12px 0" },
  thumbShell: { padding: 2, borderRadius: radii.md, background: "var(--paper-2)", flexShrink: 0 },
  thumb: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbAr: { fontFamily: font.arabic, fontSize: 16, color: "rgba(255,255,255,.75)" },
  recentTitle: { fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  recentSub: { fontSize: 12, color: "var(--muted)", marginTop: 2 },
  pill: { fontSize: 10.5, fontWeight: 700, borderRadius: radii.pill, padding: "5px 12px", flexShrink: 0 },

  scheduledCard: {
    position: "relative",
    overflow: "hidden",
    background: `linear-gradient(158deg, ${brand.greenMid} -10%, ${brand.green} 55%, ${brand.greenDeepest})`,
    borderRadius: radii.lg,
    padding: 22,
    color: "#fff",
    boxShadow: "var(--sh-2)",
  },
  scheduledWatermark: {
    position: "absolute",
    right: -18,
    top: -22,
    fontFamily: font.arabic,
    fontSize: 120,
    color: "rgba(255,255,255,.06)",
    pointerEvents: "none",
  },
  scheduledEyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,.6)",
  },
  h2White: { fontFamily: font.heading, fontSize: 18, fontWeight: 600, color: "#fff", marginTop: 12, letterSpacing: "-0.01em" },
  scheduledSub: { fontSize: 12.5, color: "rgba(255,255,255,.68)", marginTop: 4 },
  scheduledEmpty: { fontSize: 13, color: "rgba(255,255,255,.68)" },
  scheduledItem: {
    background: "rgba(255,255,255,.09)",
    borderRadius: radii.md,
    padding: 13,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,.06)",
  },
  scheduledBtn: {
    marginTop: 18,
    width: "100%",
    textAlign: "center",
    background: "rgba(255,255,255,.13)",
    border: "1px solid rgba(255,255,255,.2)",
    color: "#fff",
    borderRadius: radii.md,
    padding: 11,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font.ui,
    cursor: "pointer",
    transition: `transform ${motion.fast} ${motion.out}`,
  },
};
