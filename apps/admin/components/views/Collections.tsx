"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import type { CollectionKind } from "@althaqalayn/types";
import { CollectionModal } from "@/components/content/CollectionModal";
import { useModal } from "@/components/ModalProvider";
import type { CollectionNode } from "@/lib/useContentTree";
import { shapeTree } from "@/lib/useContentTree";
import { getClient } from "@/lib/supabase";
import { brand, collectionVocab, coverGradient, font } from "@/lib/ui";

const pick = (t: { en: string; ha?: string }) => t.en;

const KIND_LABEL: Record<CollectionKind, string> = { occasion: "Occasion", series: "Series", topic: "Topic" };

type Segment = "all" | CollectionKind;
const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "all", label: "All" },
  { key: "occasion", label: "Occasions" },
  { key: "series", label: "Series" },
  { key: "topic", label: "Topics" },
];

/** Per-kind item count sublabel, routed through the shared {@link collectionVocab}
 *  so index + detail agree: series → "N episodes", topic → "N talks",
 *  occasion → "N sittings" plus "· M years" when its items span more than one
 *  distinct group/year. */
function sublabel(node: CollectionNode): string {
  const n = node.lectures.length;
  const vocab = collectionVocab(node.kind);
  const base = `${n} ${n === 1 ? vocab.one : vocab.many}`;
  if (node.kind !== "occasion") return base;
  const years = new Set(node.lectures.map((l) => l.groupLabel ?? l.year).filter(Boolean)).size;
  return years > 1 ? `${base} · ${years} years` : base;
}

export function Collections({ onOpen }: { onOpen: (id: string) => void }) {
  const { open, close } = useModal();
  const [nodes, setNodes] = useState<CollectionNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seg, setSeg] = useState<Segment>("all");
  const [hover, setHover] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const client = getClient();
    try {
      const [collections, lectures] = await Promise.all([
        admin.listAllCollections(client),
        admin.listAllLectures(client),
      ]);
      setNodes(shapeTree(collections, lectures).collections);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load collections");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const shown = useMemo(
    () => (nodes ?? []).filter((n) => seg === "all" || n.kind === seg),
    [nodes, seg],
  );

  const openModal = (collection?: CollectionNode) =>
    open(
      <CollectionModal
        collection={collection}
        onClose={close}
        onSaved={() => {
          close();
          void reload();
        }}
      />,
    );

  // Optimistically flip the star, then persist via upsertCollection; on failure
  // reload to snap back to the server's truth.
  const toggleFeatured = async (node: CollectionNode) => {
    const next = !node.featured;
    setNodes((cur) => (cur ?? []).map((n) => (n.id === node.id ? { ...n, featured: next } : n)));
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

  if (error) return <div style={styles.notice}>Couldn’t load collections: {error}</div>;
  if (!nodes) return <div style={styles.notice}>Loading…</div>;

  return (
    <div>
      <div style={styles.pageHd}>
        <div>
          <div style={styles.pageT}>Collections</div>
          <div style={styles.pageS}>Occasions, series &amp; topics — the heart of the archive.</div>
        </div>
        <button type="button" onClick={() => openModal()} style={styles.primaryBtn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" style={{ width: 16, height: 16 }}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          New collection
        </button>
      </div>

      <div style={styles.seg}>
        {SEGMENTS.map((s) => {
          const on = s.key === seg;
          return (
            <button key={s.key} type="button" onClick={() => setSeg(s.key)} style={{ ...styles.segBtn, ...(on ? styles.segBtnOn : null) }}>
              {s.label}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div style={styles.empty}>No collections{seg === "all" ? " yet" : ` of this kind`}.</div>
      ) : (
        <div style={styles.grid}>
          {shown.map((node) => {
            const hot = hover === node.id;
            return (
              <div
                key={node.id}
                onMouseEnter={() => setHover(node.id)}
                onMouseLeave={() => setHover(null)}
                style={{
                  ...styles.card,
                  transform: hot ? "translateY(-3px)" : "translateY(0)",
                  boxShadow: hot ? "var(--sh-2)" : "var(--sh-1)",
                }}
              >
                <div style={{ ...styles.cover, background: coverGradient(node.cover.gradient[0], node.cover.gradient[1]) }}>
                  <button type="button" onClick={() => onOpen(node.id)} style={styles.coverHit} aria-label={`Open ${pick(node.title)}`}>
                    {node.cover.arabic ? <span style={styles.arabic}>{node.cover.arabic}</span> : null}
                  </button>
                  <div style={styles.coverActions}>
                    <button
                      type="button"
                      onClick={() => openModal(node)}
                      title="Edit collection"
                      aria-label="Edit collection"
                      style={styles.coverBtn}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={styles.coverIcon}>
                        <path d="M4 20h4L18 10l-4-4L4 16z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleFeatured(node)}
                      title={node.featured ? "Featured on app Home" : "Feature on app Home"}
                      aria-pressed={node.featured ?? false}
                      style={{ ...styles.coverBtn, ...(node.featured ? styles.favOn : null) }}
                    >
                      <svg viewBox="0 0 24 24" fill={node.featured ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.9} strokeLinejoin="round" style={{ ...styles.coverIcon, color: node.featured ? brand.gold : "#fff" }}>
                        <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <button type="button" onClick={() => onOpen(node.id)} style={styles.body}>
                  <div style={styles.title}>{pick(node.title)}</div>
                  <div style={styles.meta}>
                    <span style={styles.kind}>{KIND_LABEL[node.kind]}</span>
                    <span style={styles.cnt} className="tnum">{sublabel(node)}</span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  notice: { color: "var(--muted)", fontSize: 14, padding: 8 },

  pageHd: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22 },
  pageT: { fontFamily: font.heading, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" },
  pageS: { fontSize: 14, color: "var(--muted)", marginTop: 5 },
  primaryBtn: {
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
    flexShrink: 0,
  },

  seg: {
    display: "inline-flex",
    gap: 4,
    background: "var(--field)",
    border: "1px solid var(--line)",
    borderRadius: 999,
    padding: 4,
    marginBottom: 22,
  },
  segBtn: {
    padding: "8px 16px",
    borderRadius: 999,
    border: "none",
    background: "transparent",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--muted)",
    fontFamily: font.ui,
    cursor: "pointer",
  },
  segBtnOn: { background: "var(--card)", color: "var(--green-2)", boxShadow: "var(--sh-1)" },

  empty: { fontSize: 13.5, color: "var(--muted)", padding: "40px 0", textAlign: "center" },

  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 },
  card: {
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-lg)",
    overflow: "hidden",
    boxShadow: "var(--sh-1)",
    transition: "transform .22s var(--ease), box-shadow .22s var(--ease)",
  },
  cover: { position: "relative", height: 120, display: "flex", alignItems: "center", justifyContent: "center" },
  coverHit: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  arabic: { fontFamily: font.arabic, fontSize: 42, color: "rgba(255,255,255,.92)" },
  coverActions: { position: "absolute", top: 12, right: 12, display: "flex", gap: 8 },
  coverBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    background: "rgba(0,0,0,.28)",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  favOn: { background: "rgba(0,0,0,.36)" },
  coverIcon: { width: 15, height: 15, color: "#fff" },

  body: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    padding: "16px 18px 18px",
    cursor: "pointer",
    fontFamily: font.ui,
  },
  title: { fontFamily: font.heading, fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" },
  meta: { display: "flex", alignItems: "center", gap: 8, marginTop: 12 },
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
  cnt: { fontSize: 12.5, color: "var(--muted)" },
};
