"use client";

import { useState, type CSSProperties } from "react";
import { useContentTree } from "@/lib/useContentTree";
import { ContentTree, type NewKind, type NodeRef } from "./ContentTree";
import { NodeDetail } from "./NodeDetail";

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
        {/* Tasks 11–14 replace this block with the editor when mode==="edit"/"new". */}
        <NodeDetail tree={tree} selected={selected} onEdit={() => setMode("edit")} />
      </div>
    </div>
  );
}

const shell: CSSProperties = { display: "flex", height: "100%", margin: -26, border: "1px solid var(--line)", borderRadius: 0, background: "var(--bg)" };
const detail: CSSProperties = { flex: 1, overflowY: "auto", minWidth: 0 };
const pad: CSSProperties = { padding: 26, color: "var(--muted)" };
