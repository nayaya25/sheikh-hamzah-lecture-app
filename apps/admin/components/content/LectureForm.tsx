"use client";

import { useState } from "react";
import { admin } from "@althaqalayn/api";
import { LANGUAGES, MEDIA_TYPES, type Language, type MediaType, type Lecture, type PublishStatus } from "@althaqalayn/types";
import { BilingualField, DateField, NumberStepper, ParentPicker, PublishControl, SelectField, TextArea } from "@/components/fields";
import { MediaZone } from "@/components/MediaZone";
import { MediaPreview } from "@/components/MediaPreview";
import { SectionedForm, type FormSection } from "@/components/SectionedForm";
import { getClient } from "@/lib/supabase";
import { YEARS } from "@/lib/ui";
import { EditorFooter } from "./EditorFooter";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";
const TYPE_LABELS: Record<MediaType, string> = { audio: "Audio", video: "Video", text: "Text" };

export function LectureForm({
  lecture,
  scope,
  seriesId,
  programId,
  programs,
  onCancel,
  onSaved,
  onCreateProgram,
}: {
  lecture: Lecture | null;
  scope: "series" | "single";
  seriesId?: string;
  programId?: string;
  programs: { value: string; label: string }[];
  onCancel: () => void;
  onSaved: () => void;
  onCreateProgram: (name: string) => Promise<string>;
}) {
  const [titleEn, setTitleEn] = useState(lecture ? pick(lecture.title) : "");
  const [titleHa, setTitleHa] = useState(lecture?.title.ha ?? "");
  const [type, setType] = useState<MediaType>(lecture?.type ?? "audio");
  const [language, setLanguage] = useState<Language>(lecture?.language ?? "ha");
  const [year, setYear] = useState(lecture?.year ?? YEARS[0]);
  const [program, setProgram] = useState(lecture?.programId ?? programId ?? "");
  const [episode, setEpisode] = useState<number | null>(lecture?.episode ?? null);
  const [mediaUrl, setMediaUrl] = useState(lecture?.mediaUrl ?? "");
  const [durationMin, setDurationMin] = useState<number | null>(lecture?.duration ? Math.round(lecture.duration / 60) : null);
  const [bodyEn, setBodyEn] = useState(lecture?.body?.en ?? "");
  const [descEn, setDescEn] = useState(lecture?.description?.en ?? "");
  const [date, setDate] = useState(lecture?.date ?? new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<PublishStatus>(lecture?.status ?? "published");
  const [scheduledFor, setScheduledFor] = useState(lecture?.scheduledFor ? lecture.scheduledFor.slice(0, 16) : "");
  const [mediaBusy, setMediaBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const save = async () => {
    if (!titleEn.trim()) { setTitleError("English title is required."); return; }
    setBusy(true); setError(null);
    try {
      await admin.upsertLecture(
        getClient(),
        {
          scope,
          title: { en: titleEn.trim(), ...(titleHa.trim() ? { ha: titleHa.trim() } : {}) },
          type,
          language,
          date,
          status,
          ...(year ? { year } : {}),
          ...(status === "scheduled" && scheduledFor ? { scheduledFor: new Date(scheduledFor).toISOString() } : {}),
          ...(descEn.trim() ? { description: { en: descEn.trim() } } : {}),
          ...(type === "text" && bodyEn.trim() ? { body: { en: bodyEn.trim() } } : {}),
          ...(type !== "text" && mediaUrl ? { mediaUrl } : {}),
          ...(durationMin ? { duration: durationMin * 60 } : {}),
          ...(scope === "series"
            ? { ...(seriesId ?? lecture?.seriesId ? { seriesId: seriesId ?? lecture?.seriesId } : {}), ...(program ? { programId: program } : {}), ...(episode != null ? { episode } : {}) }
            : { ...(program ? { programId: program } : {}) }),
        },
        lecture?.id,
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
          <BilingualField label="TITLE" en={titleEn} ha={titleHa} onEn={(v) => { setTitleEn(v); setTitleError(null); }} onHa={setTitleHa} placeholder="Lecture title" errorEn={titleError} />
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><SelectField label="MEDIA TYPE" value={type} onChange={(v) => setType(v as MediaType)} options={MEDIA_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))} /></div>
            <div style={{ flex: 1 }}><SelectField label="LANGUAGE" value={language} onChange={(v) => setLanguage(v as Language)} options={LANGUAGES.map((l) => ({ value: l, label: l === "ha" ? "Hausa" : "English" }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><SelectField label="YEAR" value={year} onChange={setYear} options={(year && !YEARS.includes(year) ? [year, ...YEARS] : YEARS).map((y) => ({ value: y, label: y }))} /></div>
            {scope === "series" ? <div style={{ width: 150 }}><NumberStepper label="EPISODE #" value={episode} onChange={setEpisode} /></div> : null}
          </div>
          {scope === "single" ? <ParentPicker label="PROGRAM (OPTIONAL)" value={program} onChange={setProgram} options={programs} onCreate={onCreateProgram} allowNone /> : null}
          <DateField label="DATE" value={date} onChange={setDate} />
        </>
      ),
    },
    {
      key: "media",
      title: type === "text" ? "Reader body" : "Media",
      render: () =>
        type === "text" ? (
          <>
            <TextArea label="BODY (ENGLISH)" value={bodyEn} onChange={setBodyEn} rows={6} placeholder="The full text shown in the reader…" />
            <div style={{ marginTop: 10 }}><MediaPreview type="text" body={bodyEn} /></div>
          </>
        ) : (
          <>
            <MediaZone type={type} value={mediaUrl} onChange={setMediaUrl} onBusyChange={setMediaBusy} onDurationDetected={(s) => setDurationMin(Math.round(s / 60))} />
            <div style={{ width: 160 }}><NumberStepper label="LENGTH (MIN)" value={durationMin} onChange={setDurationMin} min={0} /></div>
          </>
        ),
    },
    {
      key: "publish",
      title: "Description & publish",
      render: () => (
        <>
          <TextArea label="DESCRIPTION" value={descEn} onChange={setDescEn} rows={3} placeholder="Short summary shown on the lecture page…" />
          <PublishControl status={status} scheduledFor={scheduledFor} onChange={(n) => { setStatus(n.status); setScheduledFor(n.scheduledFor); }} />
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 28 }}>
      <SectionedForm
        sections={sections}
        error={error}
        footer={<EditorFooter busy={busy} disabled={mediaBusy} saveLabel={lecture ? "Save changes" : status === "published" ? "Publish" : status === "scheduled" ? "Schedule" : "Save draft"} onCancel={onCancel} onSave={() => void save()} />}
      />
    </div>
  );
}
