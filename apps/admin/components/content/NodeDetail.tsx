"use client";

import type { CSSProperties } from "react";
import { coverGradient, font, mediaBadge, statusPill } from "@/lib/ui";
import { MediaPreview } from "@/components/MediaPreview";
import type { ContentTree, SeriesNode } from "@/lib/useContentTree";
import type { NodeRef } from "./ContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

export function NodeDetail({
  tree,
  selected,
  onEdit,
}: {
  tree: ContentTree;
  selected: NodeRef | null;
  onEdit: () => void;
}) {
  if (!selected) return <Overview tree={tree} />;

  if (selected.kind === "program") {
    const p = tree.programs.find((x) => x.id === selected.id);
    if (!p) return <Missing />;
    return (
      <Frame title={pick(p.title)} sub="Program" onEdit={onEdit}>
        <Meta label="Series" value={String(p.seriesNodes.length)} />
        {p.description?.en ? <Meta label="Description" value={p.description.en} /> : null}
      </Frame>
    );
  }

  if (selected.kind === "series") {
    const s = findSeries(tree, selected.id);
    if (!s) return <Missing />;
    return (
      <Frame title={pick(s.title)} sub="Series" onEdit={onEdit}>
        <div style={{ ...cover, background: coverGradient(s.cover.gradient[0], s.cover.gradient[1]) }}>
          {s.cover.arabic ? <span style={motif}>{s.cover.arabic}</span> : null}
        </div>
        <Meta label="Kind" value={s.occasion ?? s.kind} />
        {s.year ? <Meta label="Year" value={s.year} /> : null}
        <Meta label="Language" value={s.language === "ha" ? "Hausa" : "English"} />
        <Meta label="Episodes" value={String(s.episodes.length)} />
      </Frame>
    );
  }

  // episode or standalone → a lecture
  const l = selected.kind === "episode" ? findEpisode(tree, selected.id) : tree.standalone.find((x) => x.id === selected.id);
  if (!l) return <Missing />;
  const badge = mediaBadge(l.type);
  const pill = statusPill(l.status);
  return (
    <Frame title={pick(l.title)} sub={selected.kind === "episode" ? "Episode" : "Standalone lecture"} onEdit={onEdit}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <span style={{ ...chip, background: badge.bg, color: badge.fg }}>{l.type.toUpperCase()}</span>
        <span style={{ ...chip, background: pill.bg, color: pill.fg }}>{pill.label}</span>
      </div>
      {l.type === "text" ? (
        <MediaPreview type="text" body={l.body?.en ?? l.body?.ha} />
      ) : (
        <MediaPreview type={l.type} url={l.mediaUrl} />
      )}
      {l.episode != null ? <Meta label="Episode" value={`Part ${l.episode}`} /> : null}
      {l.year ? <Meta label="Year" value={l.year} /> : null}
      <Meta label="Language" value={l.language === "ha" ? "Hausa" : "English"} />
      {l.duration ? <Meta label="Length" value={`${Math.round(l.duration / 60)} min`} /> : null}
      <Meta label="Date" value={l.date} />
      {l.description?.en ? <Meta label="Description" value={l.description.en} /> : null}
    </Frame>
  );
}

function findSeries(tree: ContentTree, id: string): SeriesNode | undefined {
  for (const p of tree.programs) {
    const hit = p.seriesNodes.find((s) => s.id === id);
    if (hit) return hit;
  }
  return tree.orphanSeries.find((s) => s.id === id);
}
function findEpisode(tree: ContentTree, id: string) {
  for (const p of tree.programs) for (const s of p.seriesNodes) { const e = s.episodes.find((x) => x.id === id); if (e) return e; }
  for (const s of tree.orphanSeries) { const e = s.episodes.find((x) => x.id === id); if (e) return e; }
  return undefined;
}

function Overview({ tree }: { tree: ContentTree }) {
  const seriesCount = tree.programs.reduce((n, p) => n + p.seriesNodes.length, 0) + tree.orphanSeries.length;
  const epCount =
    tree.programs.reduce((n, p) => n + p.seriesNodes.reduce((m, s) => m + s.episodes.length, 0), 0) +
    tree.orphanSeries.reduce((m, s) => m + s.episodes.length, 0) +
    tree.standalone.length;
  return (
    <div style={{ padding: 40, color: "var(--muted)" }}>
      <div style={{ fontFamily: font.heading, fontSize: 20, color: "var(--ink)", marginBottom: 8 }}>Content</div>
      <div style={{ fontSize: 13.5 }}>
        {tree.programs.length} programs · {seriesCount} series · {epCount} lectures.
      </div>
      <div style={{ fontSize: 13, marginTop: 12 }}>Select an item on the left, or use <b>+ New</b> to add content.</div>
    </div>
  );
}

function Frame({ title, sub, onEdit, children }: { title: string; sub: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div style={{ padding: 28, maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".5px", color: "var(--faint)" }}>{sub.toUpperCase()}</div>
          <div style={{ fontFamily: font.heading, fontSize: 22, fontWeight: 600, marginTop: 4 }}>{title}</div>
        </div>
        <button onClick={onEdit} style={editBtn}>Edit</button>
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
const chip: CSSProperties = { fontSize: 9.5, fontWeight: 800, letterSpacing: ".5px", borderRadius: 6, padding: "4px 8px" };
const cover: CSSProperties = { height: 120, borderRadius: 14, position: "relative", overflow: "hidden", marginBottom: 8 };
const motif: CSSProperties = { position: "absolute", right: 10, top: -10, fontFamily: font.arabic, fontSize: 72, color: "rgba(255,255,255,.16)" };
