"use client";

import { useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import type { MediaType } from "@althaqalayn/types";
import { SelectField } from "@/components/fields";
import { fieldInput } from "@/components/fields";
import { MediaZone } from "@/components/MediaZone";
import { SectionedForm, type FormSection } from "@/components/SectionedForm";
import { getClient } from "@/lib/supabase";
import { brand } from "@/lib/ui";
import { EditorFooter } from "./EditorFooter";
import type { SeriesNode } from "@/lib/useContentTree";

interface Row { key: number; titleEn: string; titleHa: string; episode: number; mediaUrl: string; }

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
  const [rows, setRows] = useState<Row[]>([{ key: 0, titleEn: "", titleHa: "", episode: startNum, mediaUrl: "" }]);
  const [busy, setBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (key: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const add = () => setRows((rs) => [...rs, { key: (rs.at(-1)?.key ?? 0) + 1, titleEn: "", titleHa: "", episode: (rs.at(-1)?.episode ?? startNum) + 1, mediaUrl: "" }]);
  const remove = (key: number) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));

  const save = async () => {
    const valid = rows.filter((r) => r.titleEn.trim());
    if (!valid.length) { setError("Add at least one episode with a title."); return; }
    setBusy(true); setError(null);
    try {
      await Promise.all(valid.map((r) =>
        admin.upsertLecture(getClient(), {
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
        }),
      ));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const sections: FormSection[] = [
    {
      key: "shared",
      title: `Add episodes to ${series.title.en}`,
      render: () => (
        <>
          <SelectField label="MEDIA TYPE (ALL)" value={type} onChange={(v) => setType(v as MediaType)} options={[{ value: "audio", label: "Audio" }, { value: "video", label: "Video" }, { value: "text", label: "Text" }]} />
          <div style={{ marginTop: 16 }}>
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
                    <MediaZone type={type} value={r.mediaUrl} onChange={(url) => patch(r.key, { mediaUrl: url })} onBusyChange={setMediaBusy} compact />
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
      <SectionedForm sections={sections} error={error} footer={<EditorFooter busy={busy} disabled={mediaBusy} saveLabel={`Publish ${rows.filter((r) => r.titleEn.trim()).length || ""} episode(s)`.replace("  ", " ")} onCancel={onCancel} onSave={() => void save()} />} />
    </div>
  );
}

const rowCard: CSSProperties = { border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginBottom: 12, background: "var(--bg)" };
const addRow: CSSProperties = { width: "100%", padding: 12, border: "1.5px dashed var(--line)", borderRadius: 10, background: "transparent", color: brand.greenMid, fontSize: 13, fontWeight: 700, cursor: "pointer" };
