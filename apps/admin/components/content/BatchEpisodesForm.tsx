"use client";

import { useRef, useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import type { MediaType } from "@althaqalayn/types";
import { SelectField } from "@/components/fields";
import { fieldInput } from "@/components/fields";
import { MediaZone } from "@/components/MediaZone";
import { SectionedForm, type FormSection } from "@/components/SectionedForm";
import { getClient } from "@/lib/supabase";
import { brand } from "@/lib/ui";
import { uploadMedia } from "@/lib/upload";
import { EditorFooter } from "./EditorFooter";
import type { SeriesNode } from "@/lib/useContentTree";

type UploadStatus = "idle" | "uploading" | "done" | "error";

interface Row {
  key: number;
  titleEn: string;
  titleHa: string;
  episode: number;
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

const emptyRow = (key: number, episode: number): Row => ({ key, titleEn: "", titleHa: "", episode, mediaUrl: "" });

export function BatchEpisodesForm({
  series,
  onCancel,
  onSaved,
}: {
  series: SeriesNode;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const startNum = (series.episodes.reduce((m, e) => Math.max(m, e.episode ?? 0), 0)) + 1;
  const [type, setType] = useState<MediaType>("audio");
  const [rows, setRows] = useState<Row[]>([emptyRow(0, startNum)]);
  const [busy, setBusy] = useState(false);
  const [busyRows, setBusyRows] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setRowBusy = (key: number, rowBusy: boolean) =>
    setBusyRows((prev) => {
      const next = new Set(prev);
      if (rowBusy) next.add(key); else next.delete(key);
      return next;
    });
  const mediaBusy = busyRows.size > 0;

  const patch = (key: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const add = () => setRows((rs) => [...rs, emptyRow((rs.at(-1)?.key ?? 0) + 1, (rs.at(-1)?.episode ?? startNum) + 1)]);
  const remove = (key: number) => {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
    setRowBusy(key, false);
  };
  const clearAll = () => {
    setRows([emptyRow(0, startNum)]);
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
    const maxEpisode = base.length ? base.reduce((m, r) => Math.max(m, r.episode), 0) : startNum - 1;
    const startKey = (base.at(-1)?.key ?? -1) + 1;
    const newRows: Row[] = files.map((file, idx) => ({
      key: startKey + idx,
      titleEn: titleFromFilename(file.name),
      titleHa: "",
      episode: maxEpisode + 1 + idx,
      mediaUrl: "",
      file,
      uploadStatus: "uploading",
    }));
    setRows([...base, ...newRows]);
    void runPool(newRows, 3, uploadRow);
  };

  const save = async () => {
    const valid = rows.filter((r) => r.titleEn.trim());
    if (!valid.length) { setError("Add at least one episode with a title."); return; }
    setBusy(true); setError(null);
    let succeeded = 0;
    const failures: string[] = [];
    try {
      await runPool(valid, 6, async (r) => {
        try {
          await admin.upsertLecture(getClient(), {
            scope: "series",
            title: { en: r.titleEn.trim(), ...(r.titleHa.trim() ? { ha: r.titleHa.trim() } : {}) },
            type,
            language: series.language,
            date: new Date().toISOString().slice(0, 10),
            status: "published",
            ...(series.year ? { year: series.year } : {}),
            seriesId: series.id,
            ...(series.programId ? { programId: series.programId } : {}),
            episode: r.episode,
            ...(type !== "text" && r.mediaUrl ? { mediaUrl: r.mediaUrl } : {}),
          });
          succeeded += 1;
        } catch (e) {
          failures.push(`Episode ${r.episode} (${r.titleEn.trim()}): ${e instanceof Error ? e.message : "failed"}`);
        }
      });
      if (failures.length) {
        setError(`Saved ${succeeded} of ${valid.length} episode(s). ${failures.length} failed: ${failures.slice(0, 3).join("; ")}${failures.length > 3 ? "…" : ""}`);
      } else {
        onSaved();
      }
    } finally {
      setBusy(false);
    }
  };

  const readyCount = rows.filter((r) => r.titleEn.trim()).length;

  const sections: FormSection[] = [
    {
      key: "shared",
      title: `Add episodes to ${series.title.en}`,
      render: () => (
        <>
          <SelectField label="MEDIA TYPE (ALL)" value={type} onChange={(v) => setType(v as MediaType)} options={[{ value: "audio", label: "Audio" }, { value: "video", label: "Video" }, { value: "text", label: "Text" }]} />

          {type !== "text" ? (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={() => fileInputRef.current?.click()} style={selectFilesBtn}>
                Select {type} files…
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={type === "video" ? "video/*" : "audio/*"}
                hidden
                onChange={(e) => {
                  onFilesSelected(e.target.files);
                  e.target.value = "";
                }}
              />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                Pick many files at once — a row is created per file, titled from its filename.
              </span>
            </div>
          ) : null}

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>
              {readyCount} episode{readyCount === 1 ? "" : "s"} ready
            </span>
            <button type="button" onClick={clearAll} style={clearAllBtn}>Clear all</button>
          </div>

          <div style={{ marginTop: 10 }}>
            {rows.map((r) => (
              <div key={r.key} style={rowCard}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Episode {r.episode}</span>
                  {rows.length > 1 ? <button type="button" onClick={() => remove(r.key)} style={{ background: "transparent", border: "none", color: "#a23e3e", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Remove</button> : null}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={r.titleEn} onChange={(e) => patch(r.key, { titleEn: e.target.value })} placeholder="Title (English)" style={{ ...fieldInput, flex: 1 }} />
                  <input value={String(r.episode)} onChange={(e) => patch(r.key, { episode: Number(e.target.value) || r.episode })} inputMode="numeric" style={{ ...fieldInput, width: 64 }} />
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
                        <button type="button" onClick={() => retryUpload(r.key)} style={retryBtn}>Retry upload</button>
                      </div>
                    ) : (
                      <MediaZone type={type} value={r.mediaUrl} onChange={(url) => patch(r.key, { mediaUrl: url })} onBusyChange={(b) => setRowBusy(r.key, b)} compact />
                    )}
                  </div>
                ) : null}
              </div>
            ))}
            <button type="button" onClick={add} style={addRow}>+ Add another episode</button>
          </div>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 28 }}>
      <SectionedForm sections={sections} error={error} footer={<EditorFooter busy={busy} disabled={mediaBusy} saveLabel={`Publish ${readyCount || ""} episode(s)`.replace("  ", " ")} onCancel={onCancel} onSave={() => void save()} />} />
    </div>
  );
}

const rowCard: CSSProperties = { border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginBottom: 12, background: "var(--bg)" };
const addRow: CSSProperties = { width: "100%", padding: 12, border: "1.5px dashed var(--line)", borderRadius: 10, background: "transparent", color: brand.greenMid, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const selectFilesBtn: CSSProperties = { padding: "10px 16px", borderRadius: 10, border: "none", background: brand.greenMid, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const clearAllBtn: CSSProperties = { background: "transparent", border: "none", color: "var(--muted)", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline" };
const uploadingBox: CSSProperties = { border: "1.5px solid var(--line)", borderRadius: 10, padding: 12, background: "var(--input)" };
const errorBox: CSSProperties = { border: "1.5px solid #a23e3e", borderRadius: 10, padding: 12, background: "var(--input)" };
const retryBtn: CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", color: brand.greenMid, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const barTrack: CSSProperties = { height: 4, borderRadius: 4, background: "var(--line)", overflow: "hidden", marginTop: 8 };
const barFill: CSSProperties = { height: "100%", width: "40%", background: brand.greenMid, borderRadius: 4, animation: "mediaZoneBar 1s ease-in-out infinite" };
