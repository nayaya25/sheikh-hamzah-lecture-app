"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { admin } from "@althaqalayn/api";
import type { Lecture, MediaType } from "@althaqalayn/types";
import { BulkAddModal } from "@/components/content/BulkAddModal";
import { CollectionModal } from "@/components/content/CollectionModal";
import { LectureModal } from "@/components/content/LectureModal";
import { useConfirm } from "@/components/ConfirmProvider";
import { useModal } from "@/components/ModalProvider";
import { getClient } from "@/lib/supabase";
import { brand, coverGradient, font, statusPill } from "@/lib/ui";
import { groupLectures, shapeTree, type CollectionNode, type LectureGroup } from "@/lib/useContentTree";

const pick = (t: { en: string; ha?: string }) => t.en;

const KIND_LABEL: Record<CollectionNode["kind"], string> = {
  occasion: "Occasion",
  series: "Series",
  topic: "Topic",
};

// Per-kind noun used in group-header counts + the hero meta line.
const GROUP_NOUN: Record<CollectionNode["kind"], string> = {
  occasion: "sitting",
  series: "episode",
  topic: "talk",
};

/** mm:ss (or h:mm:ss) from a duration in seconds. */
function fmtDuration(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const mm = String(m).padStart(2, "0");
  const s2 = String(ss).padStart(2, "0");
  return h ? `${h}:${mm}:${s2}` : `${m}:${s2}`;
}

const DATE_FMT = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });
function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length <= 10 ? "T00:00:00" : ""));
  return Number.isNaN(d.getTime()) ? iso : DATE_FMT.format(d);
}

const TYPE_LABEL: Record<MediaType, string> = { audio: "Audio", video: "Video", text: "Text" };

/** The sub-line under a lecture title: duration/date for media, "Text · reader" for text. */
function lectureSub(l: Lecture): string {
  if (l.type === "text") return "Text · reader";
  const parts: string[] = [];
  if (l.duration) parts.push(fmtDuration(l.duration));
  else if (l.status === "draft") parts.push(`${TYPE_LABEL[l.type]} · not yet published`);
  else parts.push(TYPE_LABEL[l.type]);
  if (l.duration && l.date) parts.push(fmtDate(l.date));
  return parts.join(" · ");
}

/** Hero meta line: count + how the app lays the lectures out. */
function heroMeta(node: CollectionNode): string {
  const n = node.lectures.length;
  if (node.kind === "series") return `${n} episode${n === 1 ? "" : "s"}`;
  const noun = node.kind === "topic" ? "talk" : "lecture";
  const base = `${n} ${noun}${n === 1 ? "" : "s"}`;
  const groups = new Set(node.lectures.map((l) => l.groupLabel).filter(Boolean)).size;
  if (groups > 1) return `${base} · grouped by ${node.kind === "topic" ? "topic" : "year"}`;
  return base;
}

const TYPE_ICON: Record<MediaType, ReactNode> = {
  audio: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9z" />
      <path d="M17 8a5 5 0 010 8" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3z" />
    </>
  ),
  text: (
    <>
      <path d="M6 3h9l5 5v13H6z" />
      <path d="M9 12h7M9 16h5" />
    </>
  ),
};

const STAR_D = "M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z";

/**
 * Collection detail — the drill-in from a Collections card. Renders a cover
 * hero plus the collection's lectures, laid out with the shared
 * {@link groupLectures} rule: `series` is one flat `sort`-ordered list, while
 * `occasion`/`topic` group lectures under their `groupLabel` headers. Hosts the
 * create/edit modals (LectureModal, BulkAddModal, CollectionModal) and inline
 * feature-toggle / drag-reorder / delete actions, all persisting through
 * `admin.*` and reloading from the server.
 */
export function CollectionDetail({
  collectionId,
  onBack,
}: {
  collectionId: string | null;
  onBack: () => void;
}) {
  const { open, close } = useModal();
  const { confirm } = useConfirm();
  const [node, setNode] = useState<CollectionNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  // Latch so overlapping drops don't fire concurrent setLectureSort writes.
  const savingOrderRef = useRef(false);
  const dragIdRef = useRef<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!collectionId) {
      setNode(null);
      setLoading(false);
      return;
    }
    const client = getClient();
    try {
      const [collections, lectures] = await Promise.all([
        admin.listAllCollections(client),
        admin.listAllLectures(client),
      ]);
      const found = shapeTree(collections, lectures).collections.find((c) => c.id === collectionId);
      setNode(found ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load collection");
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const onSaved = useCallback(() => {
    close();
    void reload();
  }, [close, reload]);

  const openLecture = (lecture?: Lecture, groupLabel?: string) => {
    if (!node) return;
    open(
      <LectureModal
        collectionId={node.id}
        collection={node}
        {...(lecture ? { lecture } : {})}
        {...(groupLabel ? { groupLabel } : {})}
        onClose={close}
        onSaved={onSaved}
      />,
    );
  };

  const openBulk = () => {
    if (!node) return;
    open(<BulkAddModal collection={node} onClose={close} onSaved={onSaved} />);
  };

  const openEditCollection = () => {
    if (!node) return;
    open(<CollectionModal collection={node} onClose={close} onSaved={onSaved} />);
  };

  // Optimistically flip the lecture star, persist via upsertLecture, then reload.
  const toggleLectureFeatured = async (l: Lecture) => {
    const next = !l.featured;
    setNode((n) =>
      n ? { ...n, lectures: n.lectures.map((x) => (x.id === l.id ? { ...x, featured: next } : x)) } : n,
    );
    try {
      const { id, ...rest } = l;
      await admin.upsertLecture(getClient(), { ...rest, featured: next }, id);
    } catch {
      // fall through to reload — snaps back to server truth
    } finally {
      void reload();
    }
  };

  const toggleCollectionFeatured = async () => {
    if (!node) return;
    const next = !node.featured;
    setNode((n) => (n ? { ...n, featured: next } : n));
    try {
      await admin.upsertCollection(
        getClient(),
        {
          title: node.title,
          kind: node.kind,
          language: node.language,
          cover: node.cover,
          ...(node.description ? { description: node.description } : {}),
          featured: next,
          ...(node.position != null ? { position: node.position } : {}),
        },
        node.id,
      );
    } catch {
      void reload();
    }
  };

  const deleteLecture = async (l: Lecture) => {
    const ok = await confirm({
      title: `Delete “${pick(l.title)}”?`,
      body: "This lecture will be permanently removed from the archive. This can’t be undone.",
      confirmLabel: "Delete lecture",
      danger: true,
    });
    if (!ok) return;
    try {
      await admin.deleteLecture(getClient(), l.id);
    } finally {
      void reload();
    }
  };

  const deleteCollection = async () => {
    if (!node) return;
    const n = node.lectures.length;
    const ok = await confirm({
      title: `Delete “${pick(node.title)}”?`,
      body:
        n > 0
          ? `This collection and all ${n} of its lecture${n === 1 ? "" : "s"} will be permanently deleted (the lectures are deleted too). This can’t be undone.`
          : "This collection will be permanently deleted. This can’t be undone.",
      confirmLabel: "Delete collection",
      danger: true,
    });
    if (!ok) return;
    try {
      await admin.deleteCollection(getClient(), node.id);
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  // Reorder — move the dragged lecture to the drop target's slot within the
  // collection's flat sort-ordered list, then persist. The ref latch drops any
  // overlapping call while a write is in flight.
  const persistOrder = async (ordered: Lecture[]) => {
    if (savingOrderRef.current) return;
    savingOrderRef.current = true;
    setNode((n) => (n ? { ...n, lectures: ordered } : n));
    try {
      await admin.setLectureSort(getClient(), ordered.map((l) => l.id));
    } finally {
      savingOrderRef.current = false;
      void reload();
    }
  };

  const handleDrop = (targetId: string) => {
    const from = dragIdRef.current;
    dragIdRef.current = null;
    setDragId(null);
    setDropId(null);
    if (!from || from === targetId || !node) return;
    const cur = [...node.lectures];
    const fromIdx = cur.findIndex((l) => l.id === from);
    const toIdx = cur.findIndex((l) => l.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = cur.splice(fromIdx, 1);
    cur.splice(toIdx, 0, moved);
    void persistOrder(cur);
  };

  if (loading) return <div style={styles.notice}>Loading…</div>;
  if (error) return <div style={styles.notice}>Couldn’t load this collection: {error}</div>;
  if (!node) {
    return (
      <div>
        <button type="button" onClick={onBack} style={styles.crumbLink}>
          ‹ Collections
        </button>
        <div style={styles.empty}>Collection not found. It may have been deleted.</div>
      </div>
    );
  }

  const grouped = groupLectures(node);
  const isFlat = Array.isArray(grouped) && (grouped.length === 0 || !isGroupArray(grouped));

  const renderRow = (l: Lecture, index: number) => {
    const pill = statusPill(l.status);
    const hot = hover === l.id;
    const dragging = dragId === l.id;
    const over = dropId === l.id && dragId !== l.id;
    return (
      <div
        key={l.id}
        draggable
        onDragStart={(e) => {
          dragIdRef.current = l.id;
          setDragId(l.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          dragIdRef.current = null;
          setDragId(null);
          setDropId(null);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (dropId !== l.id) setDropId(l.id);
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleDrop(l.id);
        }}
        onMouseEnter={() => setHover(l.id)}
        onMouseLeave={() => setHover(null)}
        onClick={() => openLecture(l)}
        style={{
          ...styles.lec,
          ...(hot ? styles.lecHot : null),
          ...(over ? styles.lecOver : null),
          opacity: dragging ? 0.5 : 1,
        }}
      >
        <div style={styles.lecN} className="tnum">
          {index + 1}
        </div>
        <div style={{ ...styles.lecTy, background: TYPE_BG[l.type], color: TYPE_FG[l.type] }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" width={17} height={17}>
            {TYPE_ICON[l.type]}
          </svg>
        </div>
        <div style={styles.lecMain}>
          <div style={styles.lecT}>{pick(l.title)}</div>
          <div style={styles.lecS} className="tnum">
            {lectureSub(l)}
          </div>
        </div>
        <div style={styles.lecActs} onClick={(e) => e.stopPropagation()}>
          <span style={{ ...styles.pill, background: pill.bg, color: pill.fg }}>{pill.label}</span>
          <button
            type="button"
            onClick={() => void toggleLectureFeatured(l)}
            title={l.featured ? "Featured on app Home" : "Feature on app Home"}
            aria-pressed={l.featured ?? false}
            style={styles.mini}
          >
            <svg
              viewBox="0 0 24 24"
              fill={l.featured ? brand.gold : "none"}
              stroke={l.featured ? brand.gold : "currentColor"}
              strokeWidth={1.7}
              strokeLinejoin="round"
              width={15}
              height={15}
            >
              <path d={STAR_D} />
            </svg>
          </button>
          <button type="button" onClick={() => void deleteLecture(l)} title="Delete lecture" style={styles.mini}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" width={15} height={15}>
              <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" />
            </svg>
          </button>
          <span title="Drag to reorder" style={{ ...styles.mini, cursor: "grab" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" width={15} height={15}>
              <path d="M8 6h8M8 12h8M8 18h8" />
            </svg>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={styles.crumb}>
        <button type="button" onClick={onBack} style={styles.crumbLink}>
          Collections
        </button>
        <span style={{ margin: "0 6px" }}>›</span>
        <span>{pick(node.title)}</span>
      </div>

      {/* Cover hero */}
      <div style={styles.detHd}>
        <div style={{ ...styles.detCover, background: coverGradient(node.cover.gradient[0], node.cover.gradient[1]) }}>
          {node.cover.arabic ? <span style={styles.ar}>{node.cover.arabic}</span> : null}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.colMeta}>
            <span style={styles.kind}>{KIND_LABEL[node.kind]}</span>
            <span style={styles.colCnt} className="tnum">
              {heroMeta(node)}
            </span>
          </div>
          <div style={styles.detT}>{pick(node.title)}</div>
          {node.description?.en ? <div style={styles.detDesc}>{node.description.en}</div> : null}
          <div style={styles.detActions}>
            <button type="button" onClick={openEditCollection} style={styles.btnGhost}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
                <path d="M4 20h4L18 10l-4-4L4 16z" />
              </svg>
              Edit collection
            </button>
            <button
              type="button"
              onClick={() => void toggleCollectionFeatured()}
              title={node.featured ? "Featured on app Home" : "Feature on app Home"}
              aria-pressed={node.featured ?? false}
              style={{ ...styles.iconBtn, ...(node.featured ? styles.iconBtnOn : null) }}
            >
              <svg
                viewBox="0 0 24 24"
                fill={node.featured ? brand.gold : "none"}
                stroke={node.featured ? brand.gold : "currentColor"}
                strokeWidth={1.8}
                strokeLinejoin="round"
                width={17}
                height={17}
              >
                <path d={STAR_D} />
              </svg>
            </button>
            <button type="button" onClick={() => void deleteCollection()} title="Delete collection" style={styles.iconBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={17} height={17}>
                <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Lectures — flat (series) or grouped (occasion/topic) */}
      {node.lectures.length === 0 ? (
        <div style={styles.empty}>No lectures yet. Add the first one below.</div>
      ) : isFlat ? (
        (grouped as Lecture[]).map((l, i) => renderRow(l, i))
      ) : (
        (grouped as LectureGroup[]).map((g) => (
          <div key={g.label}>
            <div style={styles.grpHd}>
              <span style={styles.grpLbl}>{g.label}</span>
              <span style={styles.grpLn} />
              <span style={styles.grpCt} className="tnum">
                {g.lectures.length} {GROUP_NOUN[node.kind]}
                {g.lectures.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() => openLecture(undefined, g.label === "Ungrouped" ? undefined : g.label)}
                style={styles.grpAdd}
              >
                + Add here
              </button>
            </div>
            {g.lectures.map((l, i) => renderRow(l, i))}
          </div>
        ))
      )}

      {/* Action row */}
      <div style={styles.addRow}>
        <button type="button" onClick={() => openLecture()} style={styles.btnPrimary}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" width={16} height={16}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add lecture
        </button>
        <button type="button" onClick={openBulk} style={styles.btnGhost}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
            <path d="M12 16V4M7 9l5-5 5 5" />
            <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
          </svg>
          Bulk add episodes
        </button>
      </div>
    </div>
  );
}

/** True when `groupLectures` returned the grouped `{label, lectures}[]` shape. */
function isGroupArray(v: Lecture[] | LectureGroup[]): v is LectureGroup[] {
  return v.length > 0 && typeof (v[0] as LectureGroup).label === "string" && Array.isArray((v[0] as LectureGroup).lectures);
}

const TYPE_BG: Record<MediaType, string> = { audio: "var(--green-soft)", video: "#f6ecec", text: "#f1eef6" };
const TYPE_FG: Record<MediaType, string> = { audio: "var(--green-2)", video: "#a23e3e", text: "#6a4f9c" };

const styles: Record<string, CSSProperties> = {
  notice: { color: "var(--muted)", fontSize: 14, padding: 8 },
  empty: { fontSize: 13.5, color: "var(--muted)", padding: "36px 0", textAlign: "center" },

  crumb: { fontSize: 12.5, color: "var(--faint)", marginBottom: 8, display: "flex", alignItems: "center" },
  crumbLink: {
    background: "transparent",
    border: "none",
    color: "var(--faint)",
    fontSize: 12.5,
    fontFamily: font.ui,
    cursor: "pointer",
    padding: 0,
  },

  detHd: { display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 22 },
  detCover: {
    width: 120,
    height: 120,
    borderRadius: "var(--r-lg)",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "var(--sh-2)",
  },
  ar: { fontFamily: font.arabic, fontSize: 42, color: "rgba(255,255,255,.92)" },
  colMeta: { display: "flex", alignItems: "center", gap: 8 },
  kind: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "4px 9px",
    borderRadius: 999,
    background: "var(--green-soft)",
    color: "var(--green-2)",
  },
  colCnt: { fontSize: 12.5, color: "var(--muted)" },
  detT: {
    fontFamily: font.heading,
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    marginTop: 8,
    color: "var(--ink)",
  },
  detDesc: { fontSize: 14, color: "var(--muted)", marginTop: 8, maxWidth: 560, lineHeight: 1.6 },
  detActions: { display: "flex", gap: 10, marginTop: 16 },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 42,
    padding: "0 16px",
    borderRadius: "var(--r-md)",
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: font.ui,
    background: "var(--card)",
    border: "1px solid var(--line-2)",
    color: "var(--ink)",
    cursor: "pointer",
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: "var(--r-md)",
    border: "1px solid var(--line-2)",
    background: "var(--card)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--muted)",
    cursor: "pointer",
  },
  iconBtnOn: { background: "var(--gold-wash)", borderColor: "transparent", color: brand.gold },

  grpHd: { display: "flex", alignItems: "center", gap: 12, margin: "24px 0 12px" },
  grpLbl: { fontFamily: font.arabic, fontSize: 14, fontWeight: 700, color: "var(--ink)" },
  grpLn: { flex: 1, height: 1, background: "var(--line)" },
  grpCt: { fontSize: 12, color: "var(--faint)" },
  grpAdd: {
    background: "transparent",
    border: "none",
    color: brand.greenMid,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: font.ui,
    cursor: "pointer",
    padding: 0,
  },

  lec: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "12px 14px",
    border: "1px solid var(--line)",
    background: "var(--card)",
    borderRadius: "var(--r-md)",
    marginBottom: 8,
    cursor: "pointer",
    transition: "box-shadow .16s, transform .16s",
  },
  lecHot: { boxShadow: "var(--sh-2)", transform: "translateY(-1px)" },
  lecOver: { boxShadow: `0 0 0 2px ${brand.greenBright}` },
  lecN: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: "var(--field)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "var(--muted)",
    flexShrink: 0,
  },
  lecTy: {
    width: 36,
    height: 36,
    borderRadius: "var(--r-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lecMain: { flex: 1, minWidth: 0 },
  lecT: { fontSize: 14, fontWeight: 600, color: "var(--ink)" },
  lecS: { fontSize: 12, color: "var(--muted)", marginTop: 2 },
  lecActs: { display: "flex", alignItems: "center", gap: 6 },
  pill: { borderRadius: 999, fontSize: 10.5, fontWeight: 700, padding: "5px 11px", flexShrink: 0 },
  mini: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--faint)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
  },

  addRow: { display: "flex", gap: 10, marginTop: 20 },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 42,
    padding: "0 16px",
    borderRadius: "var(--r-md)",
    border: "none",
    background: brand.green,
    color: "#fff",
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: font.ui,
    cursor: "pointer",
    boxShadow: "0 1px 0 rgba(255,255,255,.1) inset, 0 4px 12px rgba(11,70,52,.22)",
  },
};
