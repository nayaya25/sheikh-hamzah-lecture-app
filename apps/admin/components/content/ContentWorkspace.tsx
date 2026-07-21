"use client";

import { useRef, useState, type CSSProperties } from "react";
import { admin, unwrap } from "@althaqalayn/api";
import { getClient } from "@/lib/supabase";
import { useContentTree } from "@/lib/useContentTree";
import { brand, font } from "@/lib/ui";
import { useConfirm } from "@/components/ConfirmProvider";
import { BatchEpisodesForm } from "./BatchEpisodesForm";
import { ContentTree, type NewKind, type NodeRef } from "./ContentTree";
import { LectureForm } from "./LectureForm";
import { NodeDetail } from "./NodeDetail";
import { ProgramForm } from "./ProgramForm";
import { SeriesForm } from "./SeriesForm";

export function ContentWorkspace() {
  const { confirm, alert } = useConfirm();
  const { tree, loading, error, reload } = useContentTree();
  const [selected, setSelected] = useState<NodeRef | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"read" | "edit" | "new">("read");
  const [draftNew, setDraftNew] = useState<NewKind | null>(null);
  const reorderingRef = useRef(false);

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

  const onDeleteSelected = async () => {
    if (!selected) return;
    const client = getClient();
    try {
      if (selected.kind === "program") {
        const p = findProgram(selected.id);
        if (!(await confirm({ title: `Delete program “${p ? p.title.en : ""}”?`, body: "Its series are kept but unlinked.", danger: true, confirmLabel: "Delete" }))) return;
        await admin.deleteProgram(client, selected.id);
      } else if (selected.kind === "series") {
        const s = findSeriesNode(selected.id);
        if (!(await confirm({ title: `Delete series “${s ? s.title.en : ""}”?`, body: "Its episodes are kept but unlinked.", danger: true, confirmLabel: "Delete" }))) return;
        await admin.deleteSeries(client, selected.id);
      } else {
        const l = findLecture(selected.kind, selected.id);
        if (!(await confirm({ title: `Delete “${l ? l.title.en : ""}”?`, body: "This cannot be undone.", danger: true, confirmLabel: "Delete" }))) return;
        await admin.deleteLecture(client, selected.id);
      }
      setSelected(null);
      setMode("read");
      await reload();
    } catch (e) {
      await alert({ title: "Delete failed", body: e instanceof Error ? e.message : "Delete failed" });
    }
  };

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

  /** Swap a program-series with its in-program neighbour, touching only those two rows' `position` in the true DB order. */
  const reorderProgramSeries = async (programId: string, movedId: string, dir: -1 | 1) => {
    const prog = tree.programs.find((p) => p.id === programId);
    if (!prog) return;
    const inProg = prog.seriesNodes; // display (position) order within program
    const idx = inProg.findIndex((s) => s.id === movedId);
    const neighbour = inProg[idx + dir];
    if (!neighbour) return;
    if (reorderingRef.current) return;
    reorderingRef.current = true;
    try {
      const client = getClient();
      // True flat position order, fetched fresh from the DB (not the in-memory tree, which is
      // grouped by program-created_at with orphans appended — not the real `position` order).
      const flat = unwrap<{ id: string }[]>(await client.from("series").select("id").order("position")).map((r) => r.id);
      const a = flat.indexOf(movedId);
      const b = flat.indexOf(neighbour.id);
      if (a < 0 || b < 0) return;
      [flat[a], flat[b]] = [flat[b], flat[a]];
      await admin.setSeriesPositions(client, flat);
      await reload();
    } finally {
      reorderingRef.current = false;
    }
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
          <NodeDetail tree={tree} selected={selected} onEdit={() => setMode("edit")} onDelete={() => void onDeleteSelected()} />
        )}
      </div>
    </div>
  );
}

const shell: CSSProperties = { display: "flex", height: "100%", margin: -26, border: "1px solid var(--line)", borderRadius: 0, background: "var(--bg)" };
const detail: CSSProperties = { flex: 1, overflowY: "auto", minWidth: 0 };
const pad: CSSProperties = { padding: 26, color: "var(--muted)" };
