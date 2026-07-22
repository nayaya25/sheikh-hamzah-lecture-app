"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { getClient } from "@/lib/supabase";
import { brand, font } from "@/lib/ui";
import { radii } from "@/lib/tokens";
import { useConfirm } from "@/components/ConfirmProvider";

interface FileVM {
  folder: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

const FOLDERS = ["lectures", "gallery"];

/**
 * Browsable listing of everything uploaded to the `media` storage bucket,
 * restyled for the modern Settings idiom. Lives inside a Settings `Section`,
 * so it renders rows only (the card + heading come from the Section wrapper).
 * Recovered from the deleted `MediaLibrary` view (commit d076104^) — same
 * storage list/delete calls, same `useConfirm` guard.
 */
export function MediaLibrarySection() {
  const { confirm } = useConfirm();
  const [files, setFiles] = useState<FileVM[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const client = getClient();
    try {
      const all: FileVM[] = [];
      for (const folder of FOLDERS) {
        const { data, error: e } = await client.storage
          .from("media")
          .list(folder, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
        if (e) throw new Error(e.message);
        for (const f of data ?? []) {
          if (!f.id) continue; // skip sub-folders
          all.push({
            folder,
            name: f.name,
            size: (f.metadata?.size as number) ?? 0,
            type: (f.metadata?.mimetype as string) ?? "—",
            url: client.storage.from("media").getPublicUrl(`${folder}/${f.name}`).data.publicUrl,
          });
        }
      }
      setFiles(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (f: FileVM) => {
    if (
      !(await confirm({
        title: `Delete ${f.name}?`,
        body: "Lectures/albums pointing at it will lose their media.",
        danger: true,
        confirmLabel: "Delete",
      }))
    )
      return;
    await getClient().storage.from("media").remove([`${f.folder}/${f.name}`]);
    void load();
  };

  if (error) return <div style={styles.note}>Couldn’t load media: {error}</div>;
  if (!files) return <div style={styles.note}>Loading…</div>;
  if (files.length === 0) return <div style={styles.note}>No media uploaded yet.</div>;

  const totalMB = files.reduce((s, f) => s + f.size, 0) / 1024 / 1024;

  return (
    <>
      <div style={styles.summary}>
        <span className="tnum">{files.length}</span> file{files.length === 1 ? "" : "s"} ·{" "}
        <span className="tnum">{totalMB.toFixed(1)}</span> MB used
      </div>
      {files.map((f) => (
        <div key={`${f.folder}/${f.name}`} style={styles.row}>
          <div style={styles.thumb}>{f.folder === "gallery" ? "🖼" : "▶"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <a href={f.url} target="_blank" rel="noreferrer" style={styles.name}>
              {f.name}
            </a>
            <div style={styles.meta}>
              {f.folder} · {f.type} · <span className="tnum">{(f.size / 1024 / 1024).toFixed(1)}</span> MB
            </div>
          </div>
          <button onClick={() => void remove(f)} style={styles.del}>
            Delete
          </button>
        </div>
      ))}
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  note: { padding: "16px 0", color: "var(--muted)", fontSize: 13 },
  summary: { fontSize: 12.5, color: "var(--muted)", padding: "14px 0 12px" },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "1px solid var(--line)" },
  thumb: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    background: "var(--chip)",
    color: brand.greenMid,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    flexShrink: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: 600,
    color: brand.greenMid,
    textDecoration: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "block",
  },
  meta: { fontSize: 11.5, color: "var(--muted)", marginTop: 2 },
  del: {
    background: "transparent",
    border: "none",
    fontSize: 12,
    fontWeight: 700,
    color: "#a23e3e",
    cursor: "pointer",
    fontFamily: font.ui,
    flexShrink: 0,
  },
};
