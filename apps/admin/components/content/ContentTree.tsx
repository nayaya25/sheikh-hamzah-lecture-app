"use client";

import { useState, type CSSProperties } from "react";
import type { Lecture } from "@althaqalayn/types";
import { brand, font } from "@/lib/ui";
import { groupLectures, type CollectionNode, type ContentTree as Tree, type LectureGroup } from "@/lib/useContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

export type NodeRef = { kind: "collection" | "lecture"; id: string };
export type NewKind =
  | { kind: "collection" }
  | { kind: "lecture"; collectionId: string; groupLabel?: string }
  // Not part of the tree's own required shape (see brief), but the natural
  // superset for the per-collection "+ Multiple" bulk-add entry point below —
  // Task 5's bulk-add editor is wired against this variant.
  | { kind: "lecturesBatch"; collectionId: string };

export function ContentTree({
  tree,
  selected,
  onSelect,
  onNew,
  query,
  onQuery,
  onReorderCollection,
  onReorderLecture,
}: {
  tree: Tree;
  selected: NodeRef | null;
  onSelect: (ref: NodeRef) => void;
  onNew: (k: NewKind) => void;
  query: string;
  onQuery: (q: string) => void;
  /** Swap a collection with its adjacent neighbour; caller rewrites the full `position` order. */
  onReorderCollection: (id: string, dir: -1 | 1) => void;
  /** Swap a lecture with its adjacent neighbour within one collection; caller rewrites the full `sort` order. */
  onReorderLecture: (collectionId: string, lectureId: string, dir: -1 | 1) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newOpen, setNewOpen] = useState(false);
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));
  const q = query.trim().toLowerCase();
  const match = (t?: { en: string; ha?: string }) => !q || pick(t).toLowerCase().includes(q);

  const isSel = (ref: NodeRef) => selected?.kind === ref.kind && selected?.id === ref.id;

  // The collection to pre-fill for the bottom "+ New ▾ → Lecture" shortcut: the
  // selected collection itself, or the selected lecture's parent.
  const currentCollectionId: string | undefined =
    selected?.kind === "collection"
      ? selected.id
      : selected?.kind === "lecture"
        ? tree.collections.find((c) => c.lectures.some((l) => l.id === selected.id))?.id
        : undefined;

  const renderLectureRow = (cn: CollectionNode, l: Lecture) => {
    const idx = cn.lectures.findIndex((x) => x.id === l.id);
    return (
      <div key={l.id} style={{ display: "flex", alignItems: "center", paddingLeft: 48 }}>
        <button
          onClick={() => onSelect({ kind: "lecture", id: l.id })}
          style={{ ...row(isSel({ kind: "lecture", id: l.id })), flex: 1, border: "none" }}
        >
          <span style={rowLabelText}>{pick(l.title)}</span>
        </button>
        <div style={reorderCol}>
          <button style={reorderBtn} disabled={idx <= 0} onClick={() => onReorderLecture(cn.id, l.id, -1)} aria-label="Move up">▲</button>
          <button style={reorderBtn} disabled={idx < 0 || idx >= cn.lectures.length - 1} onClick={() => onReorderLecture(cn.id, l.id, 1)} aria-label="Move down">▼</button>
        </div>
      </div>
    );
  };

  const renderGroup = (cn: CollectionNode, group: LectureGroup) =>
    group.lectures.length ? (
      <div key={group.label}>
        <div style={groupHeading}>{group.label.toUpperCase()}</div>
        {group.lectures.map((l) => renderLectureRow(cn, l))}
      </div>
    ) : null;

  const renderCollection = (cn: CollectionNode, idx: number, total: number) => {
    const open = expanded[cn.id] || !!q;
    const filteredLectures = cn.lectures.filter((l) => match(l.title));
    if (q && !match(cn.title) && filteredLectures.length === 0) return null;

    return (
      <div key={cn.id}>
        <div style={row(isSel({ kind: "collection", id: cn.id }))}>
          <button style={caret} onClick={() => toggle(cn.id)} aria-label="Expand">{open ? "▾" : "▸"}</button>
          <button style={rowLabel} onClick={() => onSelect({ kind: "collection", id: cn.id })}>{pick(cn.title)}</button>
          <span style={countBadge}>{cn.lectures.length}</span>
          <div style={reorderCol}>
            <button style={reorderBtn} disabled={idx === 0} onClick={() => onReorderCollection(cn.id, -1)} aria-label="Move up">▲</button>
            <button style={reorderBtn} disabled={idx === total - 1} onClick={() => onReorderCollection(cn.id, 1)} aria-label="Move down">▼</button>
          </div>
        </div>
        {open ? (
          cn.kind === "series" ? (
            filteredLectures.map((l) => renderLectureRow(cn, l))
          ) : (
            (groupLectures({ ...cn, lectures: filteredLectures }) as LectureGroup[]).map((g) => renderGroup(cn, g))
          )
        ) : null}
        {open ? (
          <div style={addRow}>
            <button style={addChild} onClick={() => onNew({ kind: "lecture", collectionId: cn.id })}>+ Lecture</button>
            <button style={addChild} onClick={() => onNew({ kind: "lecturesBatch", collectionId: cn.id })}>+ Multiple</button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div style={rail}>
      <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search content…" style={search} />

      <div className="noscroll" style={scroll}>
        {tree.collections.map((cn, idx) => renderCollection(cn, idx, tree.collections.length))}
      </div>

      <div style={{ position: "relative", padding: 12, borderTop: "1px solid var(--line)" }}>
        <button style={newBtn} onClick={() => setNewOpen((o) => !o)}>+ New ▾</button>
        {newOpen ? (
          <>
            <div style={scrim} onClick={() => setNewOpen(false)} />
            <div style={menu}>
              <button style={menuItem} onClick={() => { setNewOpen(false); onNew({ kind: "collection" }); }}>
                Collection
              </button>
              {currentCollectionId ? (
                <button
                  style={menuItem}
                  onClick={() => { setNewOpen(false); onNew({ kind: "lecture", collectionId: currentCollectionId }); }}
                >
                  Lecture
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

const rail: CSSProperties = { width: 300, flexShrink: 0, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", background: "var(--card)" };
const search: CSSProperties = { margin: 12, padding: "9px 12px", border: "1.5px solid var(--line)", borderRadius: 10, background: "var(--input)", fontSize: 13, outline: "none" };
const scroll: CSSProperties = { flex: 1, overflowY: "auto", padding: "0 8px 12px" };
const row = (sel: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 6, padding: "7px 8px", borderRadius: 8, background: sel ? "var(--chip)" : "transparent", cursor: "pointer",
});
const caret: CSSProperties = { background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", width: 16, fontSize: 11, flexShrink: 0 };
const rowLabel: CSSProperties = { flex: 1, textAlign: "left", background: "transparent", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: font.ui };
const rowLabelText: CSSProperties = { flex: 1, textAlign: "left", fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const countBadge: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "var(--faint)", background: "var(--chip)", borderRadius: 20, padding: "1px 8px", flexShrink: 0 };
const groupHeading: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: ".8px", color: "var(--faint)", padding: "10px 10px 4px 48px" };
const addRow: CSSProperties = { display: "flex", gap: 12, marginLeft: 26, marginTop: 2, marginBottom: 4 };
const addChild: CSSProperties = { background: "transparent", border: "none", color: brand.greenMid, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: font.ui, padding: 0 };
const newBtn: CSSProperties = { width: "100%", background: brand.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font.ui };
const scrim: CSSProperties = { position: "fixed", inset: 0, zIndex: 40 };
const menu: CSSProperties = { position: "absolute", bottom: 56, left: 12, right: 12, zIndex: 41, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.18)", padding: 6 };
const menuItem: CSSProperties = { display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", borderRadius: 7, padding: "9px 12px", fontSize: 13, fontWeight: 600, color: "var(--ink)", cursor: "pointer", fontFamily: font.ui };
const reorderCol: CSSProperties = { display: "flex", flexDirection: "column", flexShrink: 0, gap: 1 };
const reorderBtn: CSSProperties = { background: "transparent", border: "none", color: "var(--faint)", cursor: "pointer", fontSize: 8, lineHeight: 1, padding: "1px 4px" };
