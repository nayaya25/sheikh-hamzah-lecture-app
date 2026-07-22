"use client";

import type { CSSProperties } from "react";
import { coverGradient, font, mediaBadge, statusPill } from "@/lib/ui";
import { MediaPreview } from "@/components/MediaPreview";
import type { ContentTree } from "@/lib/useContentTree";
import type { NodeRef } from "./ContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

export function NodeDetail({
  tree,
  selected,
  onEdit,
  onDelete,
}: {
  tree: ContentTree;
  selected: NodeRef | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!selected) return <Overview tree={tree} />;

  if (selected.kind === "collection") {
    const c = tree.collections.find((x) => x.id === selected.id);
    if (!c) return <Missing />;
    return (
      <Frame title={pick(c.title)} sub="Collection" onEdit={onEdit} onDelete={onDelete}>
        <div style={{ ...cover, background: coverGradient(c.cover.gradient[0], c.cover.gradient[1]) }}>
          {c.cover.arabic ? <span style={motif}>{c.cover.arabic}</span> : null}
        </div>
        <Meta label="Kind" value={c.kind} />
        <Meta label="Language" value={c.language === "ha" ? "Hausa" : "English"} />
        <Meta label="Lectures" value={String(c.lectures.length)} />
        <Meta label="Featured" value={c.featured ? "Yes" : "No"} />
        {c.description?.en ? <Meta label="Description" value={c.description.en} /> : null}
      </Frame>
    );
  }

  // lecture
  const l = findLecture(tree, selected.id);
  if (!l) return <Missing />;
  const parent = tree.collections.find((c) => c.id === l.collectionId);
  const badge = mediaBadge(l.type);
  const pill = statusPill(l.status);
  return (
    <Frame title={pick(l.title)} sub="Lecture" onEdit={onEdit} onDelete={onDelete}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <span style={{ ...chip, background: badge.bg, color: badge.fg }}>{l.type.toUpperCase()}</span>
        <span style={{ ...chip, background: pill.bg, color: pill.fg }}>{pill.label}</span>
      </div>
      {l.type === "text" ? (
        <MediaPreview type="text" body={l.body?.en ?? l.body?.ha} />
      ) : (
        <MediaPreview type={l.type} url={l.mediaUrl} />
      )}
      <Meta label="Collection" value={parent ? pick(parent.title) : "—"} />
      {l.groupLabel ? <Meta label="Group" value={l.groupLabel} /> : null}
      <Meta label="Sort" value={String(l.sort)} />
      {l.year ? <Meta label="Year" value={l.year} /> : null}
      <Meta label="Language" value={l.language === "ha" ? "Hausa" : "English"} />
      {l.duration ? <Meta label="Length" value={`${Math.round(l.duration / 60)} min`} /> : null}
      <Meta label="Date" value={l.date} />
    </Frame>
  );
}

function findLecture(tree: ContentTree, id: string) {
  for (const c of tree.collections) {
    const l = c.lectures.find((x) => x.id === id);
    if (l) return l;
  }
  return undefined;
}

function Overview({ tree }: { tree: ContentTree }) {
  const lectureCount = tree.collections.reduce((n, c) => n + c.lectures.length, 0);
  return (
    <div style={{ padding: 40, color: "var(--muted)" }}>
      <div style={{ fontFamily: font.heading, fontSize: 20, color: "var(--ink)", marginBottom: 8 }}>Content</div>
      <div style={{ fontSize: 13.5 }}>
        {tree.collections.length} collections · {lectureCount} lectures.
      </div>
      <div style={{ fontSize: 13, marginTop: 12 }}>Select an item on the left, or use <b>+ New</b> to add content.</div>
    </div>
  );
}

function Frame({ title, sub, onEdit, onDelete, children }: { title: string; sub: string; onEdit: () => void; onDelete: () => void; children: React.ReactNode }) {
  return (
    <div style={{ padding: 28, maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".5px", color: "var(--faint)" }}>{sub.toUpperCase()}</div>
          <div style={{ fontFamily: font.heading, fontSize: 22, fontWeight: 600, marginTop: 4 }}>{title}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={onEdit} style={editBtn}>Edit</button>
          <button onClick={onDelete} style={deleteBtn}>Delete</button>
        </div>
      </div>
      {children}
    </div>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ paddingTop: 12, borderTop: "1px solid var(--line)", marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".5px", color: "var(--faint)", marginBottom: 5 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}
function Missing() {
  return <div style={{ padding: 40, color: "var(--muted)" }}>This item was removed. Select another.</div>;
}

const editBtn: CSSProperties = { flexShrink: 0, background: "var(--chip)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font.ui };
const deleteBtn: CSSProperties = { flexShrink: 0, background: "transparent", color: "#a23e3e", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font.ui };
const chip: CSSProperties = { fontSize: 9.5, fontWeight: 800, letterSpacing: ".5px", borderRadius: 6, padding: "4px 8px" };
const cover: CSSProperties = { height: 120, borderRadius: 14, position: "relative", overflow: "hidden", marginBottom: 8 };
const motif: CSSProperties = { position: "absolute", right: 10, top: -10, fontFamily: font.arabic, fontSize: 72, color: "rgba(255,255,255,.16)" };
