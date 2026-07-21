"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { admin, mapTranscript, unwrap, type TranscriptRow } from "@althaqalayn/api";
import type { Lecture, Transcript } from "@althaqalayn/types";
import { TranscriptEditor } from "@/components/TranscriptEditor";
import { getClient } from "@/lib/supabase";
import { brand, font } from "@/lib/ui";
import { useConfirm } from "@/components/ConfirmProvider";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";
const STATUS_UI: Record<string, { bg: string; fg: string; label: string }> = {
  complete: { bg: "#EAF3EF", fg: "#12634E", label: "Complete" },
  "auto-needs-review": { bg: "#FBF1DA", fg: "#9a7420", label: "Needs review" },
  missing: { bg: "#EFEFEA", fg: "#8b8b7e", label: "Missing" },
};

export function Transcripts({ query }: { query: string }) {
  const { confirm, alert } = useConfirm();
  const [lectures, setLectures] = useState<Lecture[] | null>(null);
  const [byLecture, setByLecture] = useState<Record<string, Transcript>>({});
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Lecture | null>(null);

  const load = useCallback(async () => {
    const client = getClient();
    try {
      const [lecs, trs] = await Promise.all([
        admin.listAllLectures(client),
        client.from("transcripts").select("*").then((r) => unwrap<TranscriptRow[]>(r).map(mapTranscript)),
      ]);
      setLectures(lecs.filter((l) => l.type !== "text")); // text lectures carry their own body
      setByLecture(Object.fromEntries(trs.map((t) => [t.lectureId, t])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const removeTranscript = async (l: Lecture, tr: Transcript) => {
    if (!(await confirm({ title: `Delete the transcript for “${pick(l.title)}”?`, body: "This cannot be undone.", danger: true, confirmLabel: "Delete" }))) return;
    try {
      await admin.deleteTranscript(getClient(), tr.id);
      await load();
    } catch (e) {
      await alert({ title: "Delete failed", body: e instanceof Error ? e.message : "Delete failed" });
    }
  };

  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () => (lectures ?? []).filter((l) => !q || pick(l.title).toLowerCase().includes(q)),
    [lectures, q],
  );
  const counts = useMemo(() => {
    const c = { complete: 0, "auto-needs-review": 0, missing: 0 };
    for (const l of lectures ?? []) {
      const s = byLecture[l.id]?.status ?? "missing";
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [lectures, byLecture]);

  if (error) return <div style={{ color: "var(--muted)" }}>Couldn’t load: {error}</div>;
  if (!lectures) return <div style={{ color: "var(--muted)" }}>Loading…</div>;

  return (
    <div>
      <div style={styles.summary}>
        <Stat label="Complete" value={counts.complete} color="#12634E" />
        <Stat label="Needs review" value={counts["auto-needs-review"]} color="#9a7420" />
        <Stat label="Missing" value={counts.missing} color="#8b8b7e" />
      </div>

      <div style={styles.card}>
        <div style={{ ...styles.rowGrid, ...styles.headRow }}>
          <div>LECTURE</div>
          <div>LANGUAGE</div>
          <div>STATUS</div>
          <div />
        </div>
        {rows.map((l) => {
          const tr = byLecture[l.id];
          const ui = STATUS_UI[tr?.status ?? "missing"];
          return (
            <div key={l.id} style={{ ...styles.rowGrid, ...styles.row }}>
              <div style={styles.title}>{pick(l.title)}</div>
              <div style={styles.muted}>{l.language === "ha" ? "Hausa" : "English"}</div>
              <div><span style={{ ...styles.pill, background: ui.bg, color: ui.fg }}>{ui.label}</span></div>
              <div style={{ textAlign: "right", display: "flex", gap: 14, justifyContent: "flex-end" }}>
                <button onClick={() => setEditing(l)} style={styles.link}>{tr ? "Review" : "Add"}</button>
                {tr ? <button onClick={() => void removeTranscript(l, tr)} style={styles.linkDanger}>Delete</button> : null}
              </div>
            </div>
          );
        })}
        {rows.length === 0 ? <div style={styles.empty}>No lectures{q ? " match" : ""}.</div> : null}
      </div>

      {editing ? (
        <TranscriptEditor
          lecture={editing}
          transcript={byLecture[editing.id] ?? null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={styles.stat}>
      <span style={{ ...styles.dot, background: color }} />
      <span style={styles.statValue}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  summary: { display: "flex", gap: 12, marginBottom: 16 },
  stat: { display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px" },
  dot: { width: 8, height: 8, borderRadius: "50%" },
  statValue: { fontFamily: font.heading, fontSize: 18, fontWeight: 600 },
  statLabel: { fontSize: 12, color: "var(--muted)" },
  card: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" },
  rowGrid: { display: "grid", gridTemplateColumns: "2.6fr 1fr 1fr 0.8fr", gap: 10, padding: "13px 18px", alignItems: "center" },
  headRow: { background: "var(--chip)", borderBottom: "1px solid var(--line)", fontSize: 10.5, fontWeight: 800, letterSpacing: ".5px", color: "var(--faint)" },
  row: { borderBottom: "1px solid var(--line)", fontSize: 13 },
  title: { fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  muted: { color: "var(--muted)" },
  pill: { fontSize: 10.5, fontWeight: 800, borderRadius: 20, padding: "4px 11px" },
  link: { background: "transparent", border: "none", fontSize: 12, fontWeight: 700, color: brand.greenMid, cursor: "pointer" },
  linkDanger: { background: "transparent", border: "none", fontSize: 12, fontWeight: 700, color: "#a23e3e", cursor: "pointer" },
  empty: { padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 },
};
