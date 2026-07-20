"use client";

import { useState } from "react";
import { admin } from "@althaqalayn/api";
import type { Program } from "@althaqalayn/types";
import { Drawer, Field, inp } from "@/components/form";
import { getClient } from "@/lib/supabase";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

/** Create/edit a program (the top-level grouping: Ramadan Tafsīr, Maulud, …). */
export function ProgramEditor({
  program,
  onClose,
  onSaved,
}: {
  program: Program | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titleEn, setTitleEn] = useState(program ? pick(program.title) : "");
  const [titleHa, setTitleHa] = useState(program?.title.ha ?? "");
  const [arabic, setArabic] = useState(program?.arabic ?? "");
  const [descEn, setDescEn] = useState(program?.description?.en ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!titleEn.trim()) return setError("English title is required.");
    setBusy(true);
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

  return (
    <Drawer
      title={program ? "Edit program" : "New program"}
      sub="Top-level grouping a series belongs to"
      onClose={onClose}
      onSave={save}
      saveLabel={busy ? "Saving…" : "Save program"}
      busy={busy}
      error={error}
    >
      <Field label="TITLE (ENGLISH)">
        <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Ramadan Tafsīr" style={inp} />
      </Field>
      <Field label="TITLE (HAUSA)">
        <input value={titleHa} onChange={(e) => setTitleHa(e.target.value)} placeholder="Tafsirin Ramadan" style={inp} />
      </Field>
      <Field label="ARABIC MOTIF (OPTIONAL)">
        <input value={arabic} onChange={(e) => setArabic(e.target.value)} placeholder="تفسير" style={{ ...inp, width: 160 }} />
      </Field>
      <Field label="DESCRIPTION">
        <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={3} placeholder="What this program covers…" style={{ ...inp, resize: "vertical" }} />
      </Field>
    </Drawer>
  );
}
