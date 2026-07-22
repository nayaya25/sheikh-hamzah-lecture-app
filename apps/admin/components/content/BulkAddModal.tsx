"use client";

import { useRef, useState, type CSSProperties, type DragEvent } from "react";
import { admin } from "@althaqalayn/api";
import type { MediaType } from "@althaqalayn/types";
import { SelectField, fieldInput } from "@/components/fields";
import { Icon } from "@/components/Icon";
import { MediaZone } from "@/components/MediaZone";
import { Modal } from "@/components/Modal";
import { getClient } from "@/lib/supabase";
import { brand, font } from "@/lib/ui";
import { uploadMedia } from "@/lib/upload";
import type { CollectionNode } from "@/lib/useContentTree";

type UploadStatus = "idle" | "uploading" | "done" | "error";

interface Row {
  key: number;
  titleEn: string;
  titleHa: string;
  sort: number;
  mediaUrl: string;
  file?: File;
  uploadStatus?: UploadStatus;
  uploadError?: string;
}

/** Runs `task` over `items` with at most `limit` in flight at once. */
async function runPool<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await task(item);
    }
  });
  await Promise.all(workers);
}

/** Filename → a readable title: strip extension, swap _/- for spaces, collapse whitespace. */
function titleFromFilename(name: string): string {
  const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

const emptyRow = (key: number, sort: number): Row => ({ key, titleEn: "", titleHa: "", sort, mediaUrl: "" });

/**
 * Bulk-add episodes as a modal — re-houses the pooled multi-file workflow of the
 * legacy batch-episodes form (the Milal 200-episode flow) into the prototype's `#m-bulk`
 * shell. Pooled upload cap 3, pooled save cap 6, busy gating, and sort
 * continuation from the collection's current max are preserved intact.
 */
export function BulkAddModal({
  collection,
  onClose,
  onSaved,
}: {
  collection: CollectionNode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const startSort = collection.lectures.length ? Math.max(...collection.lectures.map((l) => l.sort)) + 1 : 0;
  // series shows a flat sort-ordered list — group_label is meaningless there.
  const groupable = collection.kind !== "series";
  const [type, setType] = useState<MediaType>("audio");
  const [groupLabel, setGroupLabel] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow(0, startSort)]);
  const [busy, setBusy] = useState(false);
  const [busyRows, setBusyRows] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setRowBusy = (key: number, rowBusy: boolean) =>
    setBusyRows((prev) => {
      const next = new Set(prev);
      if (rowBusy) next.add(key); else next.delete(key);
      return next;
    });
  const mediaBusy = busyRows.size > 0;

  const patch = (key: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const add = () => setRows((rs) => [...rs, emptyRow((rs.at(-1)?.key ?? 0) + 1, (rs.at(-1)?.sort ?? startSort) + 1)]);
  const remove = (key: number) => {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
    setRowBusy(key, false);
  };
  const clearAll = () => {
    setRows([emptyRow(0, startSort)]);
    setBusyRows(new Set());
    setError(null);
  };

  const uploadRow = async (row: Row) => {
    if (!row.file) return;
    setRowBusy(row.key, true);
    try {
      const { url } = await uploadMedia(row.file);
      setRows((cur) => cur.map((x) => (x.key === row.key ? { ...x, mediaUrl: url, uploadStatus: "done" } : x)));
    } catch (e) {
      setRows((cur) => cur.map((x) => (x.key === row.key ? { ...x, uploadStatus: "error", uploadError: e instanceof Error ? e.message : "Upload failed" } : x)));
    } finally {
      setRowBusy(row.key, false);
    }
  };

  const retryUpload = (key: number) => {
    const row = rows.find((r) => r.key === key);
    if (!row?.file) return;
    setRows((cur) => cur.map((x) => (x.key === key ? { ...x, uploadStatus: "uploading", uploadError: undefined } : x)));
    void uploadRow({ ...row, uploadStatus: "uploading" });
  };

  const onFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const isUntouched = rows.length === 1 && !rows[0].titleEn.trim() && !rows[0].titleHa.trim() && !rows[0].mediaUrl && !rows[0].file;
    const base = isUntouched ? [] : rows;
    const maxSort = base.length ? base.reduce((m, r) => Math.max(m, r.sort), 0) : startSort - 1;
    const startKey = (base.at(-1)?.key ?? -1) + 1;
    const newRows: Row[] = files.map((file, idx) => ({
      key: startKey + idx,
      titleEn: titleFromFilename(file.name),
      titleHa: "",
      sort: maxSort + 1 + idx,
      mediaUrl: "",
      file,
      uploadStatus: "uploading",
    }));
    setRows([...base, ...newRows]);
    void runPool(newRows, 3, uploadRow);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (mediaBusy) return;
    onFilesSelected(e.dataTransfer.files);
  };

  const save = async () => {
    const valid = rows.filter((r) => r.titleEn.trim());
    if (!valid.length) { setError("Add at least one lecture with a title."); return; }
    setBusy(true); setError(null);
    let succeeded = 0;
    const failures: string[] = [];
    try {
      await runPool(valid, 6, async (r) => {
        try {
          await admin.upsertLecture(getClient(), {
            collectionId: collection.id,
            title: { en: r.titleEn.trim(), ...(r.titleHa.trim() ? { ha: r.titleHa.trim() } : {}) },
            type,
            language: collection.language,
            date: new Date().toISOString().slice(0, 10),
            status: "published",
            ...(groupable && groupLabel.trim() ? { groupLabel: groupLabel.trim() } : {}),
            sort: r.sort,
            ...(type !== "text" && r.mediaUrl ? { mediaUrl: r.mediaUrl } : {}),
          });
          succeeded += 1;
        } catch (e) {
          failures.push(`“${r.titleEn.trim()}”: ${e instanceof Error ? e.message : "failed"}`);
        }
      });
      if (failures.length) {
        setError(`Saved ${succeeded} of ${valid.length} lecture(s). ${failures.length} failed: ${failures.slice(0, 3).join("; ")}${failures.length > 3 ? "…" : ""}`);
      } else {
        onSaved();
      }
    } finally {
      setBusy(false);
    }
  };

  const readyCount = rows.filter((r) => r.titleEn.trim()).length;
  const saveDisabled = busy || mediaBusy;

  return (
    <Modal
      title="Bulk add episodes"
      subtitle={`${collection.title.en} · continues from #${startSort}`}
      onClose={onClose}
      width={560}
      footer={
        <>
          <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }} className="tnum">
            {readyCount} episode{readyCount === 1 ? "" : "s"} ready
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={onClose} style={btnGhost}>Cancel</button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saveDisabled}
              style={{ ...btnPrimary, opacity: saveDisabled ? 0.6 : 1, cursor: saveDisabled ? "not-allowed" : "pointer" }}
            >
              {busy ? "Adding…" : `Add ${readyCount || ""} episode(s)`.replace("  ", " ")}
            </button>
          </div>
        </>
      }
    >
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <SelectField
            label="MEDIA TYPE (ALL)"
            value={type}
            onChange={(v) => setType(v as MediaType)}
            options={[{ value: "audio", label: "Audio" }, { value: "video", label: "Video" }, { value: "text", label: "Text" }]}
          />
        </div>
        {groupable ? (
          <div style={{ flex: 1 }}>
            <div style={groupLabelHeading}>GROUP (ALL, OPTIONAL)</div>
            <input value={groupLabel} onChange={(e) => setGroupLabel(e.target.value)} placeholder="e.g. 1445 AH" style={fieldInput} />
          </div>
        ) : null}
      </div>

      {type !== "text" ? (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--muted)", margin: "18px 0 8px" }}>SELECT MULTIPLE FILES</div>
          <div
            onClick={() => { if (!mediaBusy) fileInputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); if (!mediaBusy) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              ...drop,
              ...(dragOver ? { borderColor: brand.greenMid, background: "var(--green-soft)" } : null),
              ...(mediaBusy ? { opacity: 0.6, cursor: "not-allowed" } : {}),
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", color: "var(--faint)" }}>
              <Icon name="upload" size={24} strokeWidth={1.7} />
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 8, color: "var(--ink)" }}>
              {dragOver ? "Drop to add episodes" : "Drop many files, or click to browse"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>Titles from filenames · order continues automatically</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={type === "video" ? "video/*" : "audio/*"}
            hidden
            disabled={mediaBusy}
            onChange={(e) => {
              onFilesSelected(e.target.files);
              e.target.value = "";
            }}
          />
        </>
      ) : null}

      <div style={callout}>
        <span style={{ flexShrink: 0, marginTop: 1, color: "var(--green-2)", display: "inline-flex" }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
        </span>
        Each file becomes an episode; you can tidy titles before saving. Uploads run pooled in the background.
      </div>

      <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>
          {readyCount} lecture{readyCount === 1 ? "" : "s"} ready
        </span>
        <button type="button" onClick={clearAll} style={clearAllBtn}>Clear all</button>
      </div>

      <div style={{ marginTop: 10 }}>
        {rows.map((r) => (
          <div key={r.key} style={rowCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Sort {r.sort}</span>
              {rows.length > 1 ? <button type="button" onClick={() => remove(r.key)} style={{ background: "transparent", border: "none", color: "#a23e3e", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Remove</button> : null}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={r.titleEn} onChange={(e) => patch(r.key, { titleEn: e.target.value })} placeholder="Title (English)" style={{ ...fieldInput, flex: 1 }} />
              <input value={String(r.sort)} onChange={(e) => { const n = Number(e.target.value); patch(r.key, { sort: e.target.value.trim() === "" || Number.isNaN(n) ? r.sort : n }); }} inputMode="numeric" style={{ ...fieldInput, width: 64 }} />
            </div>
            <input value={r.titleHa} onChange={(e) => patch(r.key, { titleHa: e.target.value })} placeholder="Title (Hausa)" style={{ ...fieldInput, marginTop: 8 }} />
            {type !== "text" ? (
              <div style={{ marginTop: 8 }}>
                {r.uploadStatus === "uploading" ? (
                  <div style={uploadingBox}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>Uploading {r.file?.name}…</div>
                    <div style={barTrack}><div style={barFill} /></div>
                  </div>
                ) : r.uploadStatus === "error" ? (
                  <div style={errorBox}>
                    <div style={{ fontSize: 12, color: "#a23e3e", fontWeight: 600, marginBottom: 6 }}>{r.uploadError || "Upload failed"}</div>
                    <button type="button" onClick={() => retryUpload(r.key)} disabled={mediaBusy} style={{ ...retryBtn, ...(mediaBusy ? { opacity: 0.5, cursor: "not-allowed" } : {}) }}>Retry upload</button>
                  </div>
                ) : (
                  <MediaZone type={type} value={r.mediaUrl} onChange={(url) => patch(r.key, { mediaUrl: url })} onBusyChange={(b) => setRowBusy(r.key, b)} compact />
                )}
              </div>
            ) : null}
          </div>
        ))}
        <button type="button" onClick={add} style={addRow}>+ Add another lecture</button>
      </div>

      {error ? <div style={errorText}>{error}</div> : null}
    </Modal>
  );
}

const groupLabelHeading: CSSProperties = { fontSize: 12.5, fontWeight: 500, color: "var(--muted)", marginBottom: 8 };
const drop: CSSProperties = { border: "1.5px dashed var(--line-2)", borderRadius: "var(--r-md)", padding: 30, textAlign: "center", background: "var(--field)", cursor: "pointer" };
const callout: CSSProperties = { marginTop: 14, fontSize: 12.5, color: "var(--green-2)", background: "var(--green-soft)", borderRadius: "var(--r-sm)", padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start", lineHeight: 1.5 };
const rowCard: CSSProperties = { border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginBottom: 12, background: "var(--bg)" };
const addRow: CSSProperties = { width: "100%", padding: 12, border: "1.5px dashed var(--line)", borderRadius: 10, background: "transparent", color: brand.greenMid, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const clearAllBtn: CSSProperties = { background: "transparent", border: "none", color: "var(--muted)", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline" };
const uploadingBox: CSSProperties = { border: "1.5px solid var(--line)", borderRadius: 10, padding: 12, background: "var(--input)" };
const errorBox: CSSProperties = { border: "1.5px solid #a23e3e", borderRadius: 10, padding: 12, background: "var(--input)" };
const retryBtn: CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", color: brand.greenMid, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const barTrack: CSSProperties = { height: 4, borderRadius: 4, background: "var(--line)", overflow: "hidden", marginTop: 8 };
const barFill: CSSProperties = { height: "100%", width: "40%", background: brand.greenMid, borderRadius: 4, animation: "mediaZoneBar 1s ease-in-out infinite" };
const errorText: CSSProperties = { fontSize: 12.5, color: "#a23e3e", marginTop: 16, fontWeight: 600 };
const btnGhost: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, height: 42, padding: "0 16px", borderRadius: "var(--r-md)",
  fontSize: 13.5, fontWeight: 600, fontFamily: font.ui, background: "var(--card)", border: "1px solid var(--line-2)", color: "var(--ink)", cursor: "pointer",
};
const btnPrimary: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, height: 42, padding: "0 16px", borderRadius: "var(--r-md)",
  fontSize: 13.5, fontWeight: 600, fontFamily: font.ui, background: brand.green, border: "none", color: "#fff",
  boxShadow: "0 1px 0 rgba(255,255,255,.1) inset, 0 4px 12px rgba(11,70,52,.22)",
};
