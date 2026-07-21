"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { getClient } from "@/lib/supabase";
import { brand, font } from "@/lib/ui";
import { useConfirm } from "@/components/ConfirmProvider";

interface FileVM {
  folder: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

const FOLDERS = ["lectures", "gallery"];

export function MediaLibrary({ query }: { query: string }) {
  const { confirm } = useConfirm();
  const [files, setFiles] = useState<FileVM[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const client = getClient();
    try {
      const all: FileVM[] = [];
      for (const folder of FOLDERS) {
        const { data, error: e } = await client.storage.from("media").list(folder, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
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

  const q = query.trim().toLowerCase();
  const shown = (files ?? []).filter((f) => !q || `${f.name} ${f.folder}`.toLowerCase().includes(q));
  const totalMB = (files ?? []).reduce((s, f) => s + f.size, 0) / 1024 / 1024;

  const remove = async (f: FileVM) => {
    if (!(await confirm({ title: `Delete ${f.name}?`, body: "Lectures/albums pointing at it will lose their media.", danger: true, confirmLabel: "Delete" }))) return;
    await getClient().storage.from("media").remove([`${f.folder}/${f.name}`]);
    void load();
  };

  if (error) return <div style={{ color: "var(--muted)" }}>Couldn’t load: {error}</div>;
  if (!files) return <div style={{ color: "var(--muted)" }}>Loading…</div>;

  return (
    <div>
      <div style={styles.summary}>
        {files.length} file{files.length === 1 ? "" : "s"} · {totalMB.toFixed(1)} MB used
      </div>
      <div style={styles.card}>
        <div style={{ ...styles.rowGrid, ...styles.headRow }}>
          <div>NAME</div>
          <div>FOLDER</div>
          <div>TYPE</div>
          <div>SIZE</div>
          <div />
        </div>
        {shown.map((f) => (
          <div key={`${f.folder}/${f.name}`} style={{ ...styles.rowGrid, ...styles.row }}>
            <a href={f.url} target="_blank" rel="noreferrer" style={styles.name}>{f.name}</a>
            <div style={styles.muted}>{f.folder}</div>
            <div style={styles.muted}>{f.type}</div>
            <div style={styles.muted}>{(f.size / 1024 / 1024).toFixed(1)} MB</div>
            <div style={{ textAlign: "right" }}>
              <button onClick={() => void remove(f)} style={styles.del}>Delete</button>
            </div>
          </div>
        ))}
        {shown.length === 0 ? <div style={styles.empty}>No files{q ? " match" : " yet"}.</div> : null}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  summary: { fontSize: 13, color: "var(--muted)", marginBottom: 14 },
  card: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" },
  rowGrid: { display: "grid", gridTemplateColumns: "2.6fr 1fr 1.2fr 0.8fr 0.8fr", gap: 10, padding: "12px 18px", alignItems: "center" },
  headRow: { background: "var(--chip)", borderBottom: "1px solid var(--line)", fontSize: 10.5, fontWeight: 800, letterSpacing: ".5px", color: "var(--faint)" },
  row: { borderBottom: "1px solid var(--line)", fontSize: 13 },
  name: { fontWeight: 600, color: brand.greenMid, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  muted: { color: "var(--muted)" },
  del: { background: "transparent", border: "none", fontSize: 12, fontWeight: 700, color: "#a23e3e", cursor: "pointer" },
  empty: { padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 },
};
