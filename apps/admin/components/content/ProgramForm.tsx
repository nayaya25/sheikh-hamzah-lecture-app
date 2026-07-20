"use client";

import { useState } from "react";
import { admin } from "@althaqalayn/api";
import { BilingualField, TextArea, TextField } from "@/components/fields";
import { SectionedForm, type FormSection } from "@/components/SectionedForm";
import { getClient } from "@/lib/supabase";
import { EditorFooter } from "./EditorFooter";
import type { ProgramNode } from "@/lib/useContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

export function ProgramForm({
  program,
  onCancel,
  onSaved,
}: {
  program: ProgramNode | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [titleEn, setTitleEn] = useState(program ? pick(program.title) : "");
  const [titleHa, setTitleHa] = useState(program?.title.ha ?? "");
  const [arabic, setArabic] = useState(program?.arabic ?? "");
  const [descEn, setDescEn] = useState(program?.description?.en ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const save = async () => {
    if (!titleEn.trim()) { setTitleError("English title is required."); return; }
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
          <BilingualField label="TITLE" en={titleEn} ha={titleHa} onEn={(v) => { setTitleEn(v); setTitleError(null); }} onHa={setTitleHa} placeholder="Program title" errorEn={titleError} />
          <TextField label="ARABIC MOTIF (OPTIONAL)" value={arabic} onChange={setArabic} placeholder="ﷺ" dir="rtl" />
          <TextArea label="DESCRIPTION" value={descEn} onChange={setDescEn} rows={3} placeholder="What this program covers…" />
        </>
      ),
    },
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
