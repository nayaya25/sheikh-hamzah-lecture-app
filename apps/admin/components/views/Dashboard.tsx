"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { admin, mapTranscript, unwrap, type TranscriptRow } from "@althaqalayn/api";
import type { Collection, CollectionKind, Lecture, Transcript } from "@althaqalayn/types";
import { getClient } from "@/lib/supabase";
import { brand, font, statusPill } from "@/lib/ui";
import { motion, radii } from "@/lib/tokens";
import type { View } from "@/lib/views";

const pick = (t: { en: string; ha?: string }) => t.en;

/** Days-granularity relative label — `Lecture.date`/`scheduledFor` carry no
 * hour-level "created at" timestamp, so this only ever resolves to whole-day
 * precision (never a fabricated "2h ago"). */
function relativeDay(iso: string): string {
  const then = new Date(iso + (iso.length <= 10 ? "T00:00:00" : ""));
  if (Number.isNaN(then.getTime())) return iso;
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days > 1 && days < 30) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const KIND_LABEL: Record<CollectionKind, string> = { occasion: "Occasions", series: "Series", topic: "Topics" };
const KIND_COLOR: Record<CollectionKind, string> = { occasion: brand.green, series: brand.greenBright, topic: brand.goldDk };

export function Dashboard({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [lectures, setLectures] = useState<Lecture[] | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const client = getClient();
    void (async () => {
      try {
        const [lecs, cols, trRows] = await Promise.all([
          admin.listAllLectures(client),
          admin.listAllCollections(client),
          client.from("transcripts").select("*").then((r) => unwrap<TranscriptRow[]>(r).map(mapTranscript)),
        ]);
        setLectures(lecs);
        setCollections(cols);
        setTranscripts(trRows);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, []);

  const collectionsById = useMemo(() => new Map(collections.map((c) => [c.id, c])), [collections]);
  const transcriptByLecture = useMemo(() => new Map(transcripts.map((t) => [t.lectureId, t])), [transcripts]);

  const all = lectures ?? [];
  const published = all.filter((l) => l.status === "published");
  const scheduled = all.filter((l) => l.status === "scheduled");
  const drafts = all.filter((l) => l.status === "draft");

  // Needs attention — every count here is a direct derivation, nothing invented.
  const missingMedia = all.filter((l) => l.type !== "text" && !l.mediaUrl);
  const missingTranscript = published.filter((l) => {
    if (l.type === "text") return false; // text lectures carry their own body, no transcript
    const tr = transcriptByLecture.get(l.id);
    return !tr || tr.status === "missing";
  });
  const attentionTotal = drafts.length + missingMedia.length + missingTranscript.length;

  const donutTotal = all.length;
  const pubPct = donutTotal ? (published.length / donutTotal) * 100 : 0;
  const schedPct = donutTotal ? (scheduled.length / donutTotal) * 100 : 0;
  const donutGradient = donutTotal
    ? `conic-gradient(${brand.green} 0 ${pubPct}%, #9a7420 ${pubPct}% ${pubPct + schedPct}%, #8b8b7e ${pubPct + schedPct}% 100%)`
    : "conic-gradient(var(--line) 0 0)";
  const livePct = donutTotal ? Math.round((published.length / donutTotal) * 100) : 0;

  const upcoming = useMemo(
    () =>
      scheduled
        .filter((l) => l.scheduledFor)
        .slice()
        .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime())
        .slice(0, 3),
    [scheduled],
  );

  const byKind = useMemo(() => {
    const kinds: CollectionKind[] = ["occasion", "series", "topic"];
    const rows = kinds.map((kind) => {
      const cols = collections.filter((c) => c.kind === kind);
      const ids = new Set(cols.map((c) => c.id));
      const lectureCount = all.filter((l) => ids.has(l.collectionId)).length;
      return { kind, collectionCount: cols.length, lectureCount };
    });
    const max = Math.max(1, ...rows.map((r) => r.lectureCount));
    return rows.map((r) => ({ ...r, pct: (r.lectureCount / max) * 100 }));
  }, [collections, all]);

  const recent = all.slice(0, 6);

  if (error) return <div style={styles.notice}>Couldn’t load the dashboard: {error}</div>;
  if (!lectures) return <div style={styles.notice}>Loading…</div>;

  const stats = [
    {
      key: "total",
      label: "Total lectures",
      value: all.length,
      icon: <path d="M4 5h16M4 12h16M4 19h10" />,
      delta: `${published.length} published`,
    },
    {
      key: "collections",
      label: "Collections",
      value: collections.length,
      icon: (
        <>
          <rect x="3" y="4" width="7" height="7" rx="1.5" />
          <rect x="14" y="4" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="6" rx="1.5" />
        </>
      ),
      delta: "Across the archive",
    },
    {
      key: "drafts",
      label: "Drafts",
      value: drafts.length,
      icon: (
        <>
          <path d="M6 3h9l5 5v13H6z" />
          <path d="M9 13h6M9 17h4" />
        </>
      ),
      delta: "Awaiting review",
    },
    {
      key: "scheduled",
      label: "Scheduled",
      value: scheduled.length,
      icon: (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </>
      ),
      delta: "Auto-publishing",
    },
  ];

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
              onClick={() => onNavigate("collections")}
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
              <div style={styles.statTop}>
                <div style={styles.statIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    {s.icon}
                  </svg>
                </div>
              </div>
              <div style={styles.statLabel}>{s.label}</div>
              <div style={styles.statValue} className="tnum">{s.value}</div>
              <div style={styles.statDelta}>{s.delta}</div>
            </button>
          );
        })}
      </div>

      {/* Needs attention + Publishing status */}
      <div style={styles.dash2}>
        <div style={styles.card}>
          <div style={styles.rowBetween}>
            <div style={styles.h2}>Needs attention</div>
            <span style={styles.panelAside} className="tnum">{attentionTotal} item{attentionTotal === 1 ? "" : "s"}</span>
          </div>
          <AttnRow
            iconBg="var(--draft-bg)"
            iconFg="var(--draft)"
            title="Drafts to finish"
            sub="Not yet visible in the app"
            count={drafts.length}
            first
            onClick={() => onNavigate("collections")}
            icon={
              <>
                <path d="M4 20h4L18 10l-4-4L4 16z" />
                <path d="M13 5l4 4" />
              </>
            }
          />
          <AttnRow
            iconBg="var(--down-bg)"
            iconFg="var(--down)"
            title="Missing a media file"
            sub="Audio/video not uploaded"
            count={missingMedia.length}
            onClick={() => onNavigate("collections")}
            icon={
              <>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 15l5-4 4 3" />
                <circle cx="8.5" cy="9.5" r="1.4" />
                <path d="M16 3l5 5M21 3l-5 5" />
              </>
            }
          />
          <AttnRow
            iconBg="var(--sched-bg)"
            iconFg="var(--sched)"
            title="No transcript yet"
            sub="Published, but text is missing"
            count={missingTranscript.length}
            onClick={() => onNavigate("collections")}
            icon={
              <>
                <path d="M6 3h9l5 5v13H6z" />
                <path d="M9 13h6M9 17h4" />
              </>
            }
          />
        </div>

        <div style={styles.card}>
          <div style={styles.h2}>Publishing status</div>
          <div style={styles.pubWrap}>
            <div style={{ ...styles.donut, background: donutGradient }}>
              <div style={styles.donutHole} />
              <div style={styles.donutCenter}>
                <div style={styles.donutN} className="tnum">{livePct}%</div>
                <div style={styles.donutL}>live</div>
              </div>
            </div>
            <div style={styles.leg}>
              <LegendRow color="var(--up)" label="Published" value={published.length} />
              <LegendRow color="var(--sched)" label="Scheduled" value={scheduled.length} />
              <LegendRow color="var(--draft)" label="Draft" value={drafts.length} />
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming schedule + Collections by kind */}
      <div style={styles.dash3}>
        <div style={styles.card}>
          <div style={styles.rowBetween}>
            <div style={styles.h2}>Upcoming schedule</div>
            <span style={styles.panelAside}>Next {upcoming.length || 3}</span>
          </div>
          {upcoming.length === 0 ? (
            <div style={styles.emptyRow}>Nothing scheduled right now.</div>
          ) : (
            upcoming.map((l, i) => {
              const c = collectionsById.get(l.collectionId);
              return (
                <div key={l.id} style={{ ...styles.actRow, borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                  <span style={{ ...styles.actDot, background: "var(--sched)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.actTitle}>{pick(l.title)}</div>
                    <div style={styles.actSub}>{c ? pick(c.title) : "—"}</div>
                  </div>
                  <span style={styles.actTime} className="tnum">
                    {l.scheduledFor ? new Date(l.scheduledFor).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.h2}>Collections by kind</div>
          <div style={{ marginTop: 18 }}>
            {byKind.map((r) => (
              <div key={r.kind} style={styles.kbar}>
                <div style={styles.kbarTop}>
                  <b>{KIND_LABEL[r.kind]}</b>
                  <span className="tnum">
                    {r.collectionCount} · {r.lectureCount} lecture{r.lectureCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div style={styles.ktrack}>
                  <div style={{ ...styles.kfill, width: `${r.pct}%`, background: KIND_COLOR[r.kind] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ ...styles.card, marginTop: 16 }}>
        <div style={styles.rowBetween}>
          <div style={styles.h2}>Recent activity</div>
          <button onClick={() => onNavigate("collections")} style={styles.link}>
            View all →
          </button>
        </div>
        {recent.length === 0 ? (
          <div style={styles.emptyRow}>No lectures yet — create one to get started.</div>
        ) : (
          recent.map((l, i) => {
            const c = collectionsById.get(l.collectionId);
            const pill = statusPill(l.status);
            const dot = l.status === "published" ? "var(--up)" : l.status === "scheduled" ? "var(--sched)" : "var(--draft)";
            return (
              <div key={l.id} style={{ ...styles.actRow, borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                <span style={{ ...styles.actDot, background: dot }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.actTitle}>{pick(l.title)}</div>
                  <div style={styles.actSub}>{c ? pick(c.title) : (l.year ?? "—")}</div>
                </div>
                <span style={{ ...styles.pill, background: pill.bg, color: pill.fg }}>{pill.label}</span>
                <span style={{ ...styles.actTime, marginLeft: 12 }}>{relativeDay(l.date)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function AttnRow({
  iconBg,
  iconFg,
  title,
  sub,
  count,
  icon,
  first,
  onClick,
}: {
  iconBg: string;
  iconFg: string;
  title: string;
  sub: string;
  count: number;
  icon: React.ReactNode;
  first?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{ ...styles.attnRow, borderTop: first ? "none" : "1px solid var(--line)" }}>
      <div style={{ ...styles.attnIcon, background: iconBg, color: iconFg }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.attnTitle}>{title}</div>
        <div style={styles.attnSub}>{sub}</div>
      </div>
      <span style={styles.attnCount} className="tnum">{count}</span>
      <svg style={styles.attnChev} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div style={styles.legItem}>
      <span style={{ ...styles.legDot, background: color }} />
      {label}
      <span style={styles.legValue} className="tnum">{value}</span>
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
  statTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  statIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    background: "var(--chip)",
    color: brand.greenMid,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: { fontSize: 13.5, color: "var(--muted)", marginTop: 16 },
  statValue: { fontFamily: font.heading, fontSize: 30, fontWeight: 700, marginTop: 4, letterSpacing: "-0.02em", lineHeight: 1 },
  statDelta: { fontSize: 12, color: "var(--muted)", marginTop: 8 },

  dash2: { display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginTop: 16 },
  dash3: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 },
  card: {
    background: "var(--card)",
    borderRadius: radii.lg,
    padding: 22,
    boxShadow: "var(--sh-1), var(--highlight)",
  },
  rowBetween: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  h2: { fontFamily: font.heading, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" },
  panelAside: { fontSize: 12.5, fontWeight: 700, color: brand.greenMid },
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

  // Needs attention
  attnRow: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    padding: "13px 0",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: font.ui,
  },
  attnIcon: { width: 40, height: 40, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  attnTitle: { fontSize: 13.5, fontWeight: 600, color: "var(--ink)" },
  attnSub: { fontSize: 12, color: "var(--muted)", marginTop: 2 },
  attnCount: { fontSize: 17, fontWeight: 700, marginLeft: "auto", color: "var(--ink)" },
  attnChev: { width: 16, height: 16, color: "var(--faint)", marginLeft: 8, flexShrink: 0 },

  // Publishing donut
  pubWrap: { display: "flex", alignItems: "center", gap: 22 },
  donut: { width: 130, height: 130, borderRadius: "50%", position: "relative", flexShrink: 0 },
  donutHole: { position: "absolute", inset: 17, borderRadius: "50%", background: "var(--card)" },
  donutCenter: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  donutN: { fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" },
  donutL: { fontSize: 10.5, color: "var(--muted)" },
  leg: { display: "flex", flexDirection: "column", gap: 13, flex: 1 },
  legItem: { display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--ink)" },
  legDot: { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },
  legValue: { marginLeft: "auto", fontWeight: 700 },

  // Collections by kind
  kbar: { marginBottom: 15 },
  kbarTop: { display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 7, color: "var(--ink)" },
  ktrack: { height: 8, borderRadius: 8, background: "var(--field)", overflow: "hidden" },
  kfill: { height: "100%", borderRadius: 8, transition: `width ${motion.slow} ${motion.standard}` },

  // Shared activity row (upcoming schedule + recent activity)
  actRow: { display: "flex", alignItems: "center", gap: 12, padding: "11px 0" },
  actDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  actTitle: { fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  actSub: { fontSize: 12, color: "var(--muted)", marginTop: 1 },
  actTime: { marginLeft: "auto", fontSize: 11.5, color: "var(--faint)", flexShrink: 0 },
  pill: { fontSize: 10.5, fontWeight: 700, borderRadius: radii.pill, padding: "5px 12px", flexShrink: 0 },
};
