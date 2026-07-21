"use client";

import { useRef, useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import { BilingualField, TextArea, TextField } from "@/components/fields";
import { SectionedForm, type FormSection } from "@/components/SectionedForm";
import { getClient } from "@/lib/supabase";
import { EditorFooter } from "./EditorFooter";
import type { ProgramNode, SeriesNode } from "@/lib/useContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

export function ProgramForm({
  program,
  onCancel,
  onSaved,
  seriesInProgram,
  onReorderProgramSeries,
  onEditSeries,
}: {
  program: ProgramNode | null;
  onCancel: () => void;
  onSaved: () => void;
  seriesInProgram?: SeriesNode[];
  onReorderProgramSeries?: (movedId: string, dir: -1 | 1) => void | Promise<void>;
  onEditSeries?: (id: string) => void;
}) {
  const [titleEn, setTitleEn] = useState(program ? pick(program.title) : "");
  const [titleHa, setTitleHa] = useState(program?.title.ha ?? "");
  const [arabic, setArabic] = useState(program?.arabic ?? "");
  const [descEn, setDescEn] = useState(program?.description?.en ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const save = async () => {
    if (!titleEn.trim()) { setTitleError("English title is required."); titleRef.current?.scrollIntoView({ block: "center" }); return; }
    setBusy(true); setError(null);
    try {
      await admin.upsertProgram(
        getClient(),
        {
          title: { en: titleEn.trim(), ...(titleHa.trim() ? { ha: titleHa.trim() } : {}) },
          ...(arabic.trim() ? { arabic: arabic.trim() } : {}),
          ...(descEn.trim() ? { description: { en: descEn.trim() } } : {}),
        },
        program?.id,
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const sections: FormSection[] = [
    {
      key: "details",
      title: "Details",
      render: () => (
        <>
          <div ref={titleRef}>
            <BilingualField label="TITLE" en={titleEn} ha={titleHa} onEn={(v) => { setTitleEn(v); setTitleError(null); }} onHa={setTitleHa} placeholder="Program title" errorEn={titleError} />
          </div>
          <TextField label="ARABIC MOTIF (OPTIONAL)" value={arabic} onChange={setArabic} placeholder="ﷺ" dir="rtl" />
          <TextArea label="DESCRIPTION" value={descEn} onChange={setDescEn} rows={3} placeholder="What this program covers…" />
        </>
      ),
    },
    ...(program && (seriesInProgram?.length ?? 0) > 0
      ? [{
          key: "series",
          title: `Series in this program (${seriesInProgram!.length})`,
          render: () => (
            <div>
              {seriesInProgram!.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button type="button" onClick={() => void onReorderProgramSeries?.(s.id, -1)} disabled={i === 0} style={reorderBtn}>▲</button>
                    <button type="button" onClick={() => void onReorderProgramSeries?.(s.id, 1)} disabled={i === seriesInProgram!.length - 1} style={reorderBtn}>▼</button>
                  </div>
                  <button type="button" onClick={() => onEditSeries?.(s.id)} style={{ flex: 1, textAlign: "left", background: "transparent", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                    {s.title.en}
                  </button>
                  <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.year ?? ""}</span>
                </div>
              ))}
            </div>
          ),
        }]
      : []),
  ];

  return (
    <div style={{ padding: 28 }}>
      <SectionedForm
        sections={sections}
        error={error}
        footer={<EditorFooter busy={busy} saveLabel={program ? "Save changes" : "Create program"} onCancel={onCancel} onSave={() => void save()} />}
      />
    </div>
  );
}

const reorderBtn: CSSProperties = { background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 9, lineHeight: 1, padding: 0 };
