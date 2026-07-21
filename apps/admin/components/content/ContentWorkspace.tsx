"use client";

import { useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import { getClient } from "@/lib/supabase";
import { useContentTree } from "@/lib/useContentTree";
import { brand, font } from "@/lib/ui";
import { BatchEpisodesForm } from "./BatchEpisodesForm";
import { ContentTree, type NewKind, type NodeRef } from "./ContentTree";
import { LectureForm } from "./LectureForm";
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
  if (error || !tree) {
    return (
      <div style={pad}>
        <div style={{ marginBottom: 12 }}>Couldn’t load content{error ? `: ${error}` : ""}.</div>
        <button
          onClick={() => void reload()}
          style={{ background: brand.green, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font.ui }}
        >
          Retry
        </button>
      </div>
    );
  }

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
  const findLecture = (kind: "episode" | "standalone", id: string) => {
    if (kind === "standalone") return tree.standalone.find((l) => l.id === id) ?? null;
    for (const p of tree.programs) for (const s of p.seriesNodes) { const e = s.episodes.find((x) => x.id === id); if (e) return e; }
    for (const s of tree.orphanSeries) { const e = s.episodes.find((x) => x.id === id); if (e) return e; }
    return null;
  };

  /** Swap a program-series with its in-program neighbour, persisting the FULL position-ordered id list. */
  const reorderProgramSeries = async (programId: string, movedId: string, dir: -1 | 1) => {
    const prog = tree.programs.find((p) => p.id === programId);
    if (!prog) return;
    const inProg = prog.seriesNodes; // display (position) order within program
    const idx = inProg.findIndex((s) => s.id === movedId);
    const neighbour = inProg[idx + dir];
    if (!neighbour) return;
    // Full global position order: all programs' series (in program order) then orphanSeries.
    const fullIds = [
      ...tree.programs.flatMap((p) => p.seriesNodes.map((s) => s.id)),
      ...tree.orphanSeries.map((s) => s.id),
    ];
    const a = fullIds.indexOf(movedId);
    const b = fullIds.indexOf(neighbour.id);
    if (a < 0 || b < 0) return;
    [fullIds[a], fullIds[b]] = [fullIds[b], fullIds[a]];
    await admin.setSeriesPositions(getClient(), fullIds);
    await reload();
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
          <SeriesForm
            series={null}
            programId={draftNew.programId}
            programs={programOptions}
            onCancel={() => setMode("read")}
            onSaved={afterSave}
            onCreateProgram={createProgram}
            onEditEpisode={(id) => { setSelected({ kind: "episode", id }); setMode("edit"); }}
            onAddEpisode={(seriesId) => { setDraftNew({ kind: "episode", seriesId }); setMode("new"); setSelected(null); }}
            onAddMultiple={(seriesId) => { setDraftNew({ kind: "episodesBatch", seriesId }); setMode("new"); setSelected(null); }}
            onEpisodesChanged={() => void reload()}
          />
        ) : mode === "edit" && selected?.kind === "program" ? (
          <ProgramForm
            program={findProgram(selected.id)}
            onCancel={() => setMode("read")}
            onSaved={afterSave}
            seriesInProgram={findProgram(selected.id)?.seriesNodes ?? []}
            onReorderProgramSeries={(movedId, dir) => reorderProgramSeries(selected.id, movedId, dir)}
            onEditSeries={(id) => { setSelected({ kind: "series", id }); setMode("edit"); }}
          />
        ) : mode === "edit" && selected?.kind === "series" ? (
          <SeriesForm
            series={findSeriesNode(selected.id)}
            programs={programOptions}
            onCancel={() => setMode("read")}
            onSaved={afterSave}
            onCreateProgram={createProgram}
            onEditEpisode={(id) => { setSelected({ kind: "episode", id }); setMode("edit"); }}
            onAddEpisode={(seriesId) => { setDraftNew({ kind: "episode", seriesId }); setMode("new"); setSelected(null); }}
            onAddMultiple={(seriesId) => { setDraftNew({ kind: "episodesBatch", seriesId }); setMode("new"); setSelected(null); }}
            onEpisodesChanged={() => void reload()}
          />
        ) : mode === "new" && draftNew?.kind === "episode" ? (
          <LectureForm lecture={null} scope="series" seriesId={draftNew.seriesId} programs={programOptions} onCancel={() => setMode("read")} onSaved={afterSave} onCreateProgram={createProgram} />
        ) : mode === "new" && draftNew?.kind === "standalone" ? (
          <LectureForm lecture={null} scope="single" programs={programOptions} onCancel={() => setMode("read")} onSaved={afterSave} onCreateProgram={createProgram} />
        ) : mode === "edit" && selected?.kind === "episode" ? (
          <LectureForm lecture={findLecture("episode", selected.id)} scope="series" programs={programOptions} onCancel={() => setMode("read")} onSaved={afterSave} onCreateProgram={createProgram} />
        ) : mode === "edit" && selected?.kind === "standalone" ? (
          <LectureForm lecture={findLecture("standalone", selected.id)} scope="single" programs={programOptions} onCancel={() => setMode("read")} onSaved={afterSave} onCreateProgram={createProgram} />
        ) : mode === "new" && draftNew?.kind === "episodesBatch" && findSeriesNode(draftNew.seriesId) ? (
          <BatchEpisodesForm series={findSeriesNode(draftNew.seriesId)!} onCancel={() => setMode("read")} onSaved={afterSave} />
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
