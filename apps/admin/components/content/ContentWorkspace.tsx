"use client";

import { useRef, useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import { getClient } from "@/lib/supabase";
import { useContentTree } from "@/lib/useContentTree";
import { brand, font } from "@/lib/ui";
import { useConfirm } from "@/components/ConfirmProvider";
import { BatchEpisodesForm } from "./BatchEpisodesForm";
import { CollectionForm } from "./CollectionForm";
import { ContentTree, type NewKind, type NodeRef } from "./ContentTree";
import { LectureForm } from "./LectureForm";
import { NodeDetail } from "./NodeDetail";

export function ContentWorkspace() {
  const { confirm, alert } = useConfirm();
  const { tree, loading, error, reload } = useContentTree();
  const [selected, setSelected] = useState<NodeRef | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"read" | "edit" | "new">("read");
  const [draftNew, setDraftNew] = useState<NewKind | null>(null);
  // Busy latch so a rapid double-click (or slow network) on the ▲/▼ reorder
  // buttons can't fire two overlapping mutations against the same stale `tree`.
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

  const collectionOptions = tree.collections.map((c) => ({ value: c.id, label: c.title.en }));

  /** Quick "+ New collection" from within the lecture editor's parent picker — a minimal series collection, renamed via its own editor afterwards. */
  const createCollection = async (name: string): Promise<string> => {
    const c = await admin.upsertCollection(getClient(), {
      title: { en: name },
      kind: "series",
      language: "ha",
      cover: { gradient: [brand.green, brand.greenMid] },
    });
    await reload();
    return c.id;
  };

  const afterSave = async () => { await reload(); setMode("read"); setDraftNew(null); };

  const findCollection = (id: string) => tree.collections.find((c) => c.id === id) ?? null;
  const findLecture = (id: string) => {
    for (const c of tree.collections) {
      const l = c.lectures.find((x) => x.id === id);
      if (l) return l;
    }
    return null;
  };

  const onDeleteSelected = async () => {
    if (!selected) return;
    const client = getClient();
    try {
      if (selected.kind === "collection") {
        const c = findCollection(selected.id);
        if (!c) return;
        const n = c.lectures.length;
        if (
          !(await confirm({
            title: `Delete collection “${c.title.en}”?`,
            body: `Its ${n} lecture${n === 1 ? "" : "s"} are deleted too.`,
            danger: true,
            confirmLabel: "Delete",
          }))
        )
          return;
        await admin.deleteCollection(client, selected.id);
      } else {
        const l = findLecture(selected.id);
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

  /** Swap a collection with its adjacent neighbour, rewriting the full ordered id list (`position = index`). Tree order already reflects `position`, so no re-fetch is needed. */
  const onReorderCollection = async (id: string, dir: -1 | 1) => {
    if (reorderingRef.current) return;
    reorderingRef.current = true;
    try {
      const ids = tree.collections.map((c) => c.id);
      const a = ids.indexOf(id);
      const b = a + dir;
      if (a < 0 || b < 0 || b >= ids.length) return;
      [ids[a], ids[b]] = [ids[b], ids[a]];
      await admin.setCollectionPositions(getClient(), ids);
      await reload();
    } finally {
      reorderingRef.current = false;
    }
  };

  /** Swap a lecture with its adjacent neighbour within one collection, rewriting that collection's full ordered id list (`sort = index`). */
  const onReorderLecture = async (collectionId: string, lectureId: string, dir: -1 | 1) => {
    if (reorderingRef.current) return;
    reorderingRef.current = true;
    try {
      const cn = findCollection(collectionId);
      if (!cn) return;
      const ids = cn.lectures.map((l) => l.id);
      const a = ids.indexOf(lectureId);
      const b = a + dir;
      if (a < 0 || b < 0 || b >= ids.length) return;
      [ids[a], ids[b]] = [ids[b], ids[a]];
      await admin.setLectureSort(getClient(), ids);
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
        onReorderCollection={onReorderCollection}
        onReorderLecture={onReorderLecture}
      />
      <div className="noscroll" style={detail}>
        {mode === "new" && draftNew?.kind === "collection" ? (
          <CollectionForm collection={null} onCancel={() => setMode("read")} onSaved={afterSave} />
        ) : mode === "edit" && selected?.kind === "collection" ? (
          <CollectionForm collection={findCollection(selected.id)} onCancel={() => setMode("read")} onSaved={afterSave} />
        ) : mode === "new" && draftNew?.kind === "lecture" ? (
          <LectureForm
            lecture={null}
            collectionId={draftNew.collectionId}
            groupLabel={draftNew.groupLabel}
            collections={collectionOptions}
            onCancel={() => setMode("read")}
            onSaved={afterSave}
            onCreateCollection={createCollection}
          />
        ) : mode === "edit" && selected?.kind === "lecture" ? (
          <LectureForm
            lecture={findLecture(selected.id)}
            collections={collectionOptions}
            onCancel={() => setMode("read")}
            onSaved={afterSave}
            onCreateCollection={createCollection}
          />
        ) : mode === "new" && draftNew?.kind === "lecturesBatch" && findCollection(draftNew.collectionId) ? (
          <BatchEpisodesForm collection={findCollection(draftNew.collectionId)!} onCancel={() => setMode("read")} onSaved={afterSave} />
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
