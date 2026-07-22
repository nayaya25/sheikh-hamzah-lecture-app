"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { admin, getTranscript } from "@althaqalayn/api";
import {
  LANGUAGES,
  MEDIA_TYPES,
  type Language,
  type Lecture,
  type MediaType,
  type PublishStatus,
} from "@althaqalayn/types";
import {
  BilingualField,
  DateField,
  FieldShell,
  NumberStepper,
  PublishControl,
  SelectField,
  TextArea,
  fieldInput,
} from "@/components/fields";
import { MediaZone } from "@/components/MediaZone";
import { MediaPreview } from "@/components/MediaPreview";
import { Modal } from "@/components/Modal";
import { Stepper, StepperFooter, useStepper } from "@/components/Stepper";
import { getClient } from "@/lib/supabase";
import { YEARS, brand } from "@/lib/ui";
import type { CollectionNode } from "@/lib/useContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";
const TYPE_LABELS: Record<MediaType, string> = { audio: "Audio", video: "Video", text: "Text" };
const STEPS = ["Details", "Media", "Transcript", "Publish"];

/** Next free `sort` for a new lecture in `c` — one past its current max (0 if empty/unset). */
function nextSort(c: CollectionNode | null | undefined): number {
  if (!c || c.lectures.length === 0) return 0;
  return Math.max(...c.lectures.map((l) => l.sort)) + 1;
}

/**
 * Lecture editor re-housed as a 4-step modal wizard — Details / Media /
 * Transcript / Publish, matching the prototype's `#m-lecture` modal. Carries the
 * same field/validation/save logic as {@link LectureForm} (bilingual title,
 * group/year/sort, media upload via {@link MediaZone}, publish control) plus an
 * inline transcript step that persists through `admin.upsertTranscript`.
 *
 * The parent collection is fixed by `collectionId` (no picker — the caller opens
 * this from a known collection). Pass the optional `collection` node to enable
 * kind-aware behaviour (hide group/year for `series`), auto-`sort`, existing
 * group-label suggestions, and a richer subtitle.
 */
export function LectureModal({
  collectionId,
  groupLabel,
  lecture,
  collection,
  onClose,
  onSaved,
}: {
  /** Parent collection this lecture belongs to (fixed by the caller). */
  collectionId: string;
  /** Pre-filled group label when creating within a specific group. */
  groupLabel?: string;
  /** Present = edit an existing lecture; absent/null = create a new one. */
  lecture?: Lecture | null;
  /** Optional parent node — enables kind-aware fields, auto-sort, and label hints. */
  collection?: CollectionNode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { step, isLast, back, next, goTo } = useStepper(STEPS.length);

  const [titleEn, setTitleEn] = useState(lecture ? pick(lecture.title) : "");
  const [titleHa, setTitleHa] = useState(lecture?.title.ha ?? "");
  const [type, setType] = useState<MediaType>(lecture?.type ?? "audio");
  const [language, setLanguage] = useState<Language>(lecture?.language ?? "ha");
  const [year, setYear] = useState(lecture?.year ?? YEARS[0]);
  const [groupLabelVal, setGroupLabelVal] = useState(lecture?.groupLabel ?? groupLabel ?? "");
  const [sort, setSort] = useState<number>(lecture?.sort ?? nextSort(collection));
  const [mediaUrl, setMediaUrl] = useState(lecture?.mediaUrl ?? "");
  const [durationMin, setDurationMin] = useState<number | null>(
    lecture?.duration ? Math.round(lecture.duration / 60) : null,
  );
  const [bodyEn, setBodyEn] = useState(lecture?.body?.en ?? "");
  const [date, setDate] = useState(lecture?.date ?? new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<PublishStatus>(lecture?.status ?? "published");
  const [scheduledFor, setScheduledFor] = useState(
    lecture?.scheduledFor ? lecture.scheduledFor.slice(0, 16) : "",
  );
  const [featured, setFeatured] = useState(lecture?.featured ?? false);
  const [transcript, setTranscript] = useState("");
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  // series shows a flat sort-ordered list — group_label/year are meaningless there.
  const groupable = collection ? collection.kind !== "series" : true;
  const existingLabels = collection
    ? Array.from(new Set(collection.lectures.map((l) => l.groupLabel).filter((g): g is string => !!g)))
    : [];

  useEffect(() => {
    setMediaBusy(false);
  }, [type]);

  // Preload an existing transcript when editing (matched on the lecture's language).
  useEffect(() => {
    if (!lecture) return;
    let cancelled = false;
    void getTranscript(getClient(), lecture.id, lecture.language)
      .then((t) => {
        if (cancelled || !t) return;
        setTranscript(t.body?.ha ?? t.body?.en ?? "");
        setTranscriptId(t.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lecture]);

  const save = async () => {
    if (!titleEn.trim()) {
      setTitleError("English title is required.");
      goTo(1);
      titleRef.current?.scrollIntoView({ block: "center" });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await admin.upsertLecture(
        getClient(),
        {
          collectionId,
          title: { en: titleEn.trim(), ...(titleHa.trim() ? { ha: titleHa.trim() } : {}) },
          type,
          language,
          sort,
          date,
          status,
          featured,
          ...(groupable && groupLabelVal.trim() ? { groupLabel: groupLabelVal.trim() } : {}),
          ...(groupable && year ? { year } : {}),
          ...(status === "scheduled" && scheduledFor
            ? { scheduledFor: new Date(scheduledFor).toISOString() }
            : {}),
          ...(type === "text" && bodyEn.trim() ? { body: { en: bodyEn.trim() } } : {}),
          ...(type !== "text" && mediaUrl ? { mediaUrl } : {}),
          ...(type !== "text" && durationMin ? { duration: durationMin * 60 } : {}),
        },
        lecture?.id,
      );

      // Persist the transcript alongside the lecture (only when there's text or
      // an existing row to update). Stored in the slot matching its language.
      const body = transcript.trim();
      if (body || transcriptId) {
        await admin.upsertTranscript(
          getClient(),
          {
            lectureId: saved.id,
            language,
            status: body ? "complete" : "missing",
            body: { en: language === "en" ? body : "", ...(language === "ha" ? { ha: body } : {}) },
          },
          transcriptId ?? undefined,
        );
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const subtitle = collection
    ? `${collection.title.en}${groupLabelVal ? ` · ${groupLabelVal}` : ""}`
    : groupLabelVal || undefined;

  return (
    <Modal
      title={lecture ? "Edit lecture" : "New lecture"}
      subtitle={subtitle}
      onClose={onClose}
      width={640}
      stepper={<Stepper steps={STEPS} current={step} />}
      footer={
        <StepperFooter
          current={step}
          total={STEPS.length}
          onBack={back}
          onNext={() => (isLast ? void save() : next())}
          finalLabel="Save lecture"
          nextDisabled={(step === 1 && !titleEn.trim()) || mediaBusy}
          busy={busy}
        />
      }
    >
      {/* Step 1 — Details */}
      {step === 1 ? (
        <div style={styles.pane}>
          <div ref={titleRef}>
            <BilingualField
              label="TITLE"
              en={titleEn}
              ha={titleHa}
              onEn={(v) => {
                setTitleEn(v);
                setTitleError(null);
              }}
              onHa={setTitleHa}
              placeholder="Lecture title"
              errorEn={titleError}
            />
          </div>
          {groupable ? (
            <div style={styles.two}>
              <FieldShell
                label="GROUP (OPTIONAL)"
                hint={
                  collection
                    ? `Sub-heading lectures are grouped under in “${collection.title.en}” (e.g. “1445 AH”).`
                    : "Sub-heading lectures are grouped under within the collection."
                }
              >
                <input
                  value={groupLabelVal}
                  onChange={(e) => setGroupLabelVal(e.target.value)}
                  placeholder="e.g. 1445 AH"
                  list="lecture-modal-group-labels"
                  style={fieldInput}
                />
                <datalist id="lecture-modal-group-labels">
                  {existingLabels.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </FieldShell>
              <SelectField
                label="YEAR"
                value={year}
                onChange={setYear}
                options={(year && !YEARS.includes(year) ? [year, ...YEARS] : YEARS).map((y) => ({
                  value: y,
                  label: y,
                }))}
              />
            </div>
          ) : null}
          <div style={styles.two}>
            <SelectField
              label="LANGUAGE"
              value={language}
              onChange={(v) => setLanguage(v as Language)}
              options={LANGUAGES.map((l) => ({ value: l, label: l === "ha" ? "Hausa" : "English" }))}
            />
            <NumberStepper label="ORDER (SORT)" value={sort} onChange={(n) => setSort(n ?? 0)} min={0} />
          </div>
          <DateField label="RECORDING DATE" value={date} onChange={setDate} />
        </div>
      ) : null}

      {/* Step 2 — Media */}
      {step === 2 ? (
        <div style={styles.pane}>
          <FieldShell label="LECTURE TYPE">
            <div style={styles.radioRow}>
              {MEDIA_TYPES.map((t) => {
                const on = t === type;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    style={{ ...styles.radio, ...(on ? styles.radioOn : null) }}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </FieldShell>
          {type === "text" ? (
            <>
              <TextArea
                label="BODY (ENGLISH)"
                value={bodyEn}
                onChange={setBodyEn}
                rows={6}
                placeholder="The full text shown in the reader…"
              />
              <div style={{ marginTop: 10 }}>
                <MediaPreview type="text" body={bodyEn} />
              </div>
            </>
          ) : (
            <>
              <FieldShell label="MEDIA FILE">
                <MediaZone
                  type={type}
                  value={mediaUrl}
                  onChange={setMediaUrl}
                  onBusyChange={setMediaBusy}
                  onDurationDetected={(s) => setDurationMin(Math.round(s / 60))}
                />
              </FieldShell>
              <div style={{ width: 160 }}>
                <NumberStepper label="LENGTH (MIN)" value={durationMin} onChange={setDurationMin} min={0} />
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* Step 3 — Transcript */}
      {step === 3 ? (
        <div style={styles.pane}>
          <TextArea
            label={`TRANSCRIPT (${language === "ha" ? "HAUSA" : "ENGLISH"})`}
            value={transcript}
            onChange={setTranscript}
            rows={7}
            placeholder="Optional — paste or type the transcript…"
          />
          <div style={styles.callout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16} style={{ flexShrink: 0 }}>
              <path d="M4 12.5l5 5 11-11" />
            </svg>
            Transcripts live with the lecture — no separate page to hunt through.
          </div>
        </div>
      ) : null}

      {/* Step 4 — Publish */}
      {step === 4 ? (
        <div style={styles.pane}>
          <PublishControl
            status={status}
            scheduledFor={scheduledFor}
            onChange={(n) => {
              setStatus(n.status);
              setScheduledFor(n.scheduledFor);
            }}
          />
          <button
            type="button"
            onClick={() => setFeatured((f) => !f)}
            style={styles.swRow}
          >
            <div style={{ textAlign: "left" }}>
              <div style={styles.swTitle}>Feature on app Home</div>
              <div style={styles.swSub}>Surfaces in the “Featured lectures” rail</div>
            </div>
            <span style={{ ...styles.toggle, ...(featured ? styles.toggleOn : null) }}>
              <span style={{ ...styles.knob, ...(featured ? styles.knobOn : null) }} />
            </span>
          </button>
          {error ? <div style={styles.error}>{error}</div> : null}
        </div>
      ) : null}
    </Modal>
  );
}

const styles: Record<string, CSSProperties> = {
  pane: { display: "flex", flexDirection: "column", gap: 14 },
  two: { display: "flex", gap: 12, alignItems: "flex-start" },
  radioRow: { display: "flex", gap: 8 },
  radio: {
    flex: 1,
    padding: "10px 8px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    background: "var(--chip)",
    color: "var(--muted)",
    border: "1px solid var(--line)",
  },
  radioOn: { background: brand.green, color: "#fff", border: "none", fontWeight: 700 },
  callout: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "11px 13px",
    borderRadius: 12,
    background: "var(--green-soft)",
    color: "var(--muted)",
    fontSize: 12.5,
    lineHeight: 1.45,
  },
  swRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    width: "100%",
    marginTop: 4,
    padding: "12px 14px",
    borderRadius: 12,
    background: "var(--field)",
    border: "1px solid var(--line)",
    cursor: "pointer",
  },
  swTitle: { fontSize: 13.5, fontWeight: 600, color: "var(--ink)" },
  swSub: { fontSize: 12, color: "var(--muted)", marginTop: 2 },
  toggle: {
    position: "relative",
    width: 42,
    height: 24,
    borderRadius: 999,
    background: "var(--line-2)",
    flexShrink: 0,
    transition: "background 160ms",
  },
  toggleOn: { background: brand.green },
  knob: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,.25)",
    transition: "transform 160ms",
  },
  knobOn: { transform: "translateX(18px)" },
  error: { fontSize: 12, color: "#a23e3e", fontWeight: 600, marginTop: 4 },
};
