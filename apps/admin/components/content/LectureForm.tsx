"use client";

import { useEffect, useRef, useState } from "react";
import { admin } from "@althaqalayn/api";
import { LANGUAGES, MEDIA_TYPES, type Language, type Lecture, type MediaType, type PublishStatus } from "@althaqalayn/types";
import { BilingualField, DateField, FieldShell, NumberStepper, ParentPicker, PublishControl, SelectField, TextArea, fieldInput } from "@/components/fields";
import { MediaZone } from "@/components/MediaZone";
import { MediaPreview } from "@/components/MediaPreview";
import { SectionedForm, type FormSection } from "@/components/SectionedForm";
import { getClient } from "@/lib/supabase";
import { YEARS } from "@/lib/ui";
import { EditorFooter } from "./EditorFooter";
import type { CollectionNode } from "@/lib/useContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";
const TYPE_LABELS: Record<MediaType, string> = { audio: "Audio", video: "Video", text: "Text" };

/** Next free `sort` for a new lecture in `c` — one past its current max (0 if empty/unset). */
function nextSort(c: CollectionNode | null): number {
  if (!c || c.lectures.length === 0) return 0;
  return Math.max(...c.lectures.map((l) => l.sort)) + 1;
}

export function LectureForm({
  lecture,
  collectionId: initialCollectionId,
  groupLabel: initialGroupLabel,
  collections,
  onCancel,
  onSaved,
  onCreateCollection,
}: {
  lecture: Lecture | null;
  /** Pre-selected parent when creating from the tree's per-collection "+ Lecture" button. */
  collectionId?: string;
  /** Pre-filled group label when creating from a specific group within an occasion/topic collection. */
  groupLabel?: string;
  collections: CollectionNode[];
  onCancel: () => void;
  onSaved: () => void;
  onCreateCollection: (name: string) => Promise<string>;
}) {
  const [titleEn, setTitleEn] = useState(lecture ? pick(lecture.title) : "");
  const [titleHa, setTitleHa] = useState(lecture?.title.ha ?? "");
  const [type, setType] = useState<MediaType>(lecture?.type ?? "audio");
  const [language, setLanguage] = useState<Language>(lecture?.language ?? "ha");
  const [year, setYear] = useState(lecture?.year ?? YEARS[0]);
  const [collectionId, setCollectionId] = useState(lecture?.collectionId ?? initialCollectionId ?? "");
  const [groupLabelVal, setGroupLabelVal] = useState(lecture?.groupLabel ?? initialGroupLabel ?? "");
  // Once true, the collection-switch effect below stops auto-recomputing `sort` —
  // either because we're editing an existing lecture, or the admin typed a value by hand.
  const [sortTouched, setSortTouched] = useState(!!lecture);
  const [sort, setSort] = useState<number>(
    lecture?.sort ?? nextSort(collections.find((c) => c.id === (initialCollectionId ?? "")) ?? null),
  );
  const [mediaUrl, setMediaUrl] = useState(lecture?.mediaUrl ?? "");
  const [durationMin, setDurationMin] = useState<number | null>(lecture?.duration ? Math.round(lecture.duration / 60) : null);
  const [bodyEn, setBodyEn] = useState(lecture?.body?.en ?? "");
  const [date, setDate] = useState(lecture?.date ?? new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<PublishStatus>(lecture?.status ?? "published");
  const [scheduledFor, setScheduledFor] = useState(lecture?.scheduledFor ? lecture.scheduledFor.slice(0, 16) : "");
  const [mediaBusy, setMediaBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const selectedCollection = collections.find((c) => c.id === collectionId) ?? null;
  // series shows a flat sort-ordered list — group_label is meaningless there.
  const groupable = selectedCollection ? selectedCollection.kind !== "series" : true;

  useEffect(() => {
    setMediaBusy(false);
  }, [type]);

  useEffect(() => {
    if (sortTouched) return;
    setSort(nextSort(selectedCollection));
    // Only the collection choice should retrigger this — `selectedCollection` is
    // derived from it, and `sortTouched` is checked, not depended on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId]);

  const collectionOptions = collections.map((c) => ({ value: c.id, label: c.title.en }));
  const existingLabels = selectedCollection
    ? Array.from(new Set(selectedCollection.lectures.map((l) => l.groupLabel).filter((g): g is string => !!g)))
    : [];

  const save = async () => {
    if (!titleEn.trim()) {
      setTitleError("English title is required.");
      titleRef.current?.scrollIntoView({ block: "center" });
      return;
    }
    if (!collectionId) {
      setError("Choose a collection.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await admin.upsertLecture(
        getClient(),
        {
          collectionId,
          title: { en: titleEn.trim(), ...(titleHa.trim() ? { ha: titleHa.trim() } : {}) },
          type,
          language,
          sort,
          date,
          status,
          ...(groupable && groupLabelVal.trim() ? { groupLabel: groupLabelVal.trim() } : {}),
          ...(year ? { year } : {}),
          ...(status === "scheduled" && scheduledFor ? { scheduledFor: new Date(scheduledFor).toISOString() } : {}),
          ...(type === "text" && bodyEn.trim() ? { body: { en: bodyEn.trim() } } : {}),
          ...(type !== "text" && mediaUrl ? { mediaUrl } : {}),
          ...(type !== "text" && durationMin ? { duration: durationMin * 60 } : {}),
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
          <div ref={titleRef}>
            <BilingualField label="TITLE" en={titleEn} ha={titleHa} onEn={(v) => { setTitleEn(v); setTitleError(null); }} onHa={setTitleHa} placeholder="Lecture title" errorEn={titleError} />
          </div>
          <ParentPicker
            label="COLLECTION"
            value={collectionId}
            onChange={(v) => { setCollectionId(v); setError(null); }}
            options={collectionOptions}
            onCreate={onCreateCollection}
          />
          {groupable ? (
            <FieldShell
              label="GROUP (OPTIONAL)"
              hint={
                selectedCollection
                  ? `Sub-heading lectures are grouped under in “${selectedCollection.title.en}” (e.g. “1445 AH”).`
                  : "Sub-heading lectures are grouped under within the collection."
              }
            >
              <input
                value={groupLabelVal}
                onChange={(e) => setGroupLabelVal(e.target.value)}
                placeholder="e.g. 1445 AH"
                list="lecture-group-labels"
                style={fieldInput}
              />
              <datalist id="lecture-group-labels">
                {existingLabels.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </FieldShell>
          ) : null}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><SelectField label="MEDIA TYPE" value={type} onChange={(v) => setType(v as MediaType)} options={MEDIA_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))} /></div>
            <div style={{ flex: 1 }}><SelectField label="LANGUAGE" value={language} onChange={(v) => setLanguage(v as Language)} options={LANGUAGES.map((l) => ({ value: l, label: l === "ha" ? "Hausa" : "English" }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><SelectField label="YEAR" value={year} onChange={setYear} options={(year && !YEARS.includes(year) ? [year, ...YEARS] : YEARS).map((y) => ({ value: y, label: y }))} /></div>
            <div style={{ width: 150 }}><NumberStepper label="SORT" value={sort} onChange={(n) => { setSort(n ?? 0); setSortTouched(true); }} min={0} /></div>
          </div>
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
      title: "Publish",
      render: () => (
        <PublishControl status={status} scheduledFor={scheduledFor} onChange={(n) => { setStatus(n.status); setScheduledFor(n.scheduledFor); }} />
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
