"use client";

import { useEffect, useState } from "react";
import { admin } from "@althaqalayn/api";
import {
  LANGUAGES,
  TRANSCRIPT_STATUSES,
  type Language,
  type Lecture,
  type Transcript,
  type TranscriptStatus,
} from "@althaqalayn/types";
import { Drawer, Label } from "@/components/form";
import { ParentPicker, SelectField, TextArea } from "@/components/fields";
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
  const [lectures, setLectures] = useState<Lecture[] | null>(null);
  const [lectureId, setLectureId] = useState(lecture.id);
  const [language, setLanguage] = useState<Language>(transcript?.language ?? lecture.language);
  const [status, setStatus] = useState<TranscriptStatus>(transcript?.status ?? "auto-needs-review");
  const [bodyEn, setBodyEn] = useState(transcript?.body?.en ?? "");
  const [bodyHa, setBodyHa] = useState(transcript?.body?.ha ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    admin
      .listAllLectures(getClient())
      .then((all) => setLectures(all.filter((l) => l.type !== "text"))) // text lectures carry their own body
      .catch(() => setLectures([]));
  }, []);

  const lectureOptions = (lectures ?? [lecture]).map((l) => ({ value: l.id, label: pick(l.title) }));

  const save = async () => {
    setError(null);
    if (!lectureId) return setError("Select a linked lecture.");
    setBusy(true);
    try {
      const en = bodyEn.trim();
      const ha = bodyHa.trim();
      await admin.upsertTranscript(
        getClient(),
        {
          lectureId,
          language,
          status,
          ...(en || ha ? { body: { en, ...(ha ? { ha } : {}) } } : {}),
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
      <ParentPicker label="LINKED LECTURE" value={lectureId} onChange={setLectureId} options={lectureOptions} />
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <SelectField
            label="LANGUAGE"
            value={language}
            onChange={(v) => setLanguage(v as Language)}
            options={LANGUAGES.map((l) => ({ value: l, label: l === "ha" ? "Hausa" : "English" }))}
          />
        </div>
        <div style={{ flex: 1 }}>
          <SelectField
            label="STATUS"
            value={status}
            onChange={(v) => setStatus(v as TranscriptStatus)}
            options={TRANSCRIPT_STATUSES.map((s) => ({ value: s, label: s }))}
          />
        </div>
      </div>
      <TextArea
        label="TRANSCRIPT TEXT (ENGLISH)"
        value={bodyEn}
        onChange={setBodyEn}
        rows={12}
        placeholder="Paste or edit the transcript…"
      />
      <TextArea
        label="TRANSCRIPT TEXT (HAUSA)"
        value={bodyHa}
        onChange={setBodyHa}
        rows={12}
        placeholder="Paste or edit the Hausa transcript…"
      />
      <Label>Tip: mark “Complete” once reviewed — the app shows the transcript in the player.</Label>
    </Drawer>
  );
}
