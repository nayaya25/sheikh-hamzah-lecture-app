"use client";

import { useState, type CSSProperties } from "react";
import { brand, font } from "@/lib/ui";
import type { ContentTree as Tree, ProgramNode, SeriesNode } from "@/lib/useContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

export type NodeRef = { kind: "program" | "series" | "episode" | "standalone"; id: string };
export type NewKind =
  | { kind: "program" }
  | { kind: "series"; programId?: string }
  | { kind: "episode"; seriesId: string }
  | { kind: "episodesBatch"; seriesId: string }
  | { kind: "standalone" };

export function ContentTree({
  tree,
  selected,
  onSelect,
  onNew,
  query,
  onQuery,
}: {
  tree: Tree;
  selected: NodeRef | null;
  onSelect: (ref: NodeRef) => void;
  onNew: (k: NewKind) => void;
  query: string;
  onQuery: (q: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newOpen, setNewOpen] = useState(false);
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));
  const q = query.trim().toLowerCase();
  const match = (t?: { en: string; ha?: string }) => !q || pick(t).toLowerCase().includes(q);

  const isSel = (ref: NodeRef) => selected?.kind === ref.kind && selected?.id === ref.id;

  const renderSeries = (sn: SeriesNode) => {
    const open = expanded[sn.id] || !!q;
    const eps = sn.episodes.filter((e) => match(e.title));
    if (q && !match(sn.title) && eps.length === 0) return null;
    return (
      <div key={sn.id}>
        <div style={{ ...row(isSel({ kind: "series", id: sn.id })), paddingLeft: 26 }}>
          <button style={caret} onClick={() => toggle(sn.id)} aria-label="Expand">{open ? "▾" : "▸"}</button>
          <button style={rowLabel} onClick={() => onSelect({ kind: "series", id: sn.id })}>{pick(sn.title)}</button>
          <span style={count}>{sn.episodes.length}</span>
        </div>
        {open
          ? eps.map((e) => (
              <button
                key={e.id}
                onClick={() => onSelect({ kind: "episode", id: e.id })}
                style={{ ...row(isSel({ kind: "episode", id: e.id })), paddingLeft: 48, border: "none", width: "100%" }}
              >
                <span style={epNum}>{e.episode ?? "•"}</span>
                <span style={rowLabelText}>{pick(e.title)}</span>
              </button>
            ))
          : null}
        {open ? (
          <button style={addChild} onClick={() => onNew({ kind: "episode", seriesId: sn.id })}>+ Episode</button>
        ) : null}
      </div>
    );
  };

  const renderProgram = (pn: ProgramNode) => {
    const open = expanded[pn.id] || !!q;
    const kids = pn.seriesNodes.filter((sn) => match(sn.title) || sn.episodes.some((e) => match(e.title)));
    if (q && !match(pn.title) && kids.length === 0) return null;
    return (
      <div key={pn.id}>
        <div style={row(isSel({ kind: "program", id: pn.id }))}>
          <button style={caret} onClick={() => toggle(pn.id)} aria-label="Expand">{open ? "▾" : "▸"}</button>
          <button style={rowLabel} onClick={() => onSelect({ kind: "program", id: pn.id })}>{pick(pn.title)}</button>
          <span style={count}>{pn.seriesNodes.length}</span>
        </div>
        {open ? kids.map(renderSeries) : null}
        {open ? (
          <button style={addChild} onClick={() => onNew({ kind: "series", programId: pn.id })}>+ Series</button>
        ) : null}
      </div>
    );
  };

  return (
    <div style={rail}>
      <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search content…" style={search} />

      <div className="noscroll" style={scroll}>
        {tree.programs.map(renderProgram)}
        {tree.orphanSeries.length ? <div style={groupLabel}>SERIES (NO PROGRAM)</div> : null}
        {tree.orphanSeries.filter((sn) => match(sn.title) || sn.episodes.some((e) => match(e.title))).map(renderSeries)}
        {tree.standalone.length ? <div style={groupLabel}>STANDALONE</div> : null}
        {tree.standalone.filter((l) => match(l.title)).map((l) => (
          <button
            key={l.id}
            onClick={() => onSelect({ kind: "standalone", id: l.id })}
            style={{ ...row(isSel({ kind: "standalone", id: l.id })), paddingLeft: 26, border: "none", width: "100%" }}
          >
            <span style={rowLabelText}>{pick(l.title)}</span>
          </button>
        ))}
      </div>

      <div style={{ position: "relative", padding: 12, borderTop: "1px solid var(--line)" }}>
        <button style={newBtn} onClick={() => setNewOpen((o) => !o)}>+ New ▾</button>
        {newOpen ? (
          <>
            <div style={scrim} onClick={() => setNewOpen(false)} />
            <div style={menu}>
              {[
                { label: "Program", k: { kind: "program" } as NewKind },
                { label: "Series", k: { kind: "series" } as NewKind },
                { label: "Standalone lecture", k: { kind: "standalone" } as NewKind },
              ].map((it) => (
                <button key={it.label} style={menuItem} onClick={() => { setNewOpen(false); onNew(it.k); }}>
                  {it.label}
                </button>
              ))}
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
const count: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "var(--faint)", background: "var(--chip)", borderRadius: 20, padding: "1px 8px", flexShrink: 0 };
const epNum: CSSProperties = { width: 20, fontSize: 10.5, fontWeight: 800, color: brand.greenMid, flexShrink: 0 };
const groupLabel: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: ".8px", color: "var(--faint)", padding: "14px 10px 6px" };
const addChild: CSSProperties = { marginLeft: 26, marginTop: 2, marginBottom: 4, background: "transparent", border: "none", color: brand.greenMid, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: font.ui };
const newBtn: CSSProperties = { width: "100%", background: brand.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font.ui };
const scrim: CSSProperties = { position: "fixed", inset: 0, zIndex: 40 };
const menu: CSSProperties = { position: "absolute", bottom: 56, left: 12, right: 12, zIndex: 41, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.18)", padding: 6 };
const menuItem: CSSProperties = { display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", borderRadius: 7, padding: "9px 12px", fontSize: 13, fontWeight: 600, color: "var(--ink)", cursor: "pointer", fontFamily: font.ui };
