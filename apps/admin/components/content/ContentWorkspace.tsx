"use client";

import { useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import { getClient } from "@/lib/supabase";
import { useContentTree } from "@/lib/useContentTree";
import { ContentTree, type NewKind, type NodeRef } from "./ContentTree";
import { NodeDetail } from "./NodeDetail";
import { ProgramForm } from "./ProgramForm";
import { SeriesForm } from "./SeriesForm";

export function ContentWorkspace() {
  const { tree, loading, error, reload } = useContentTree();
  const [selected, setSelected] = useState<NodeRef | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"read" | "edit" | "new">("read");
  const [draftNew, setDraftNew] = useState<NewKind | null>(null);

  if (loading) return <div style={pad}>Loading…</div>;
  if (error || !tree) return <div style={pad}>Couldn’t load content: {error}</div>;

  const onNew = (k: NewKind) => {
    setDraftNew(k);
    setMode("new");
    setSelected(null);
  };

  const programOptions = tree.programs.map((p) => ({ value: p.id, label: p.title.en }));

  const createProgram = async (name: string): Promise<string> => {
    const p = await admin.upsertProgram(getClient(), { title: { en: name } });
    await reload();
    return p.id;
  };

  const afterSave = async () => { await reload(); setMode("read"); setDraftNew(null); };

  const findProgram = (id: string) => tree.programs.find((p) => p.id === id) ?? null;
  const findSeriesNode = (id: string) => {
    for (const p of tree.programs) { const s = p.seriesNodes.find((x) => x.id === id); if (s) return s; }
    return tree.orphanSeries.find((x) => x.id === id) ?? null;
  };

  return (
    <div style={shell}>
      <ContentTree
        tree={tree}
        selected={selected}
        onSelect={(ref) => { setSelected(ref); setMode("read"); setDraftNew(null); }}
        onNew={onNew}
        query={query}
        onQuery={setQuery}
      />
      <div className="noscroll" style={detail}>
        {mode === "new" && draftNew?.kind === "program" ? (
          <ProgramForm program={null} onCancel={() => setMode("read")} onSaved={afterSave} />
        ) : mode === "new" && draftNew?.kind === "series" ? (
          <SeriesForm series={null} programId={draftNew.programId} programs={programOptions} onCancel={() => setMode("read")} onSaved={afterSave} onCreateProgram={createProgram} />
        ) : mode === "edit" && selected?.kind === "program" ? (
          <ProgramForm program={findProgram(selected.id)} onCancel={() => setMode("read")} onSaved={afterSave} />
        ) : mode === "edit" && selected?.kind === "series" ? (
          <SeriesForm series={findSeriesNode(selected.id)} programs={programOptions} onCancel={() => setMode("read")} onSaved={afterSave} onCreateProgram={createProgram} />
        ) : (
          <NodeDetail tree={tree} selected={selected} onEdit={() => setMode("edit")} />
        )}
      </div>
    </div>
  );
}

const shell: CSSProperties = { display: "flex", height: "100%", margin: -26, border: "1px solid var(--line)", borderRadius: 0, background: "var(--bg)" };
const detail: CSSProperties = { flex: 1, overflowY: "auto", minWidth: 0 };
const pad: CSSProperties = { padding: 26, color: "var(--muted)" };
