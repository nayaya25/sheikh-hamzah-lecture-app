"use client";

import { useState } from "react";
import { admin } from "@althaqalayn/api";
import { TRANSCRIPT_STATUSES, type Lecture, type Transcript, type TranscriptStatus } from "@althaqalayn/types";
import { Drawer, Field, inp, Label, sel } from "@/components/form";
import { getClient } from "@/lib/supabase";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

export function TranscriptEditor({
  lecture,
  transcript,
  onClose,
  onSaved,
}: {
  lecture: Lecture;
  transcript: Transcript | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<TranscriptStatus>(transcript?.status ?? "auto-needs-review");
  const [text, setText] = useState(transcript?.body?.en ?? transcript?.body?.ha ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      await admin.upsertTranscript(
        getClient(),
        {
          lectureId: lecture.id,
          language: lecture.language,
          status,
          ...(text.trim() ? { body: { en: text.trim() } } : {}),
        },
        transcript?.id,
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
      title="Transcript"
      sub={pick(lecture.title)}
      onClose={onClose}
      onSave={save}
      saveLabel={busy ? "Saving…" : "Save transcript"}
      busy={busy}
      error={error}
    >
      <Field label="STATUS">
        <select value={status} onChange={(e) => setStatus(e.target.value as TranscriptStatus)} style={sel}>
          {TRANSCRIPT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label={`TRANSCRIPT TEXT (${lecture.language === "ha" ? "HAUSA" : "ENGLISH"})`}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder="Paste or edit the transcript…" style={{ ...inp, resize: "vertical" }} />
      </Field>
      <Label>Tip: mark “Complete” once reviewed — the app shows the transcript in the player.</Label>
    </Drawer>
  );
}
