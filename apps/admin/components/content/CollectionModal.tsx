"use client";

import { useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import { COLLECTION_KINDS, LANGUAGES, type CollectionKind, type Language } from "@althaqalayn/types";
import { BilingualField, GradientPicker, SelectField, TextArea } from "@/components/fields";
import { Modal } from "@/components/Modal";
import { Stepper, StepperFooter, useStepper } from "@/components/Stepper";
import { getClient } from "@/lib/supabase";
import { brand } from "@/lib/ui";
import type { CollectionNode } from "@/lib/useContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";
const KIND_LABELS: Record<CollectionKind, string> = { occasion: "Occasion", series: "Series", topic: "Topic" };

/**
 * Collection editor as a 2-step modal wizard — Details → Appearance, matching
 * the prototype's `#m-collection`. Re-houses the field logic + `upsertCollection`
 * call from CollectionForm. `collection` present ⇒ edit, absent ⇒ new.
 */
export function CollectionModal({
  collection,
  onClose,
  onSaved,
}: {
  collection?: CollectionNode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { step, back, next } = useStepper(2);

  const [titleEn, setTitleEn] = useState(collection ? pick(collection.title) : "");
  const [titleHa, setTitleHa] = useState(collection?.title.ha ?? "");
  const [kind, setKind] = useState<CollectionKind>(collection?.kind ?? "series");
  const [language, setLanguage] = useState<Language>(collection?.language ?? "ha");
  const [descEn, setDescEn] = useState(collection?.description?.en ?? "");
  const [gradient, setGradient] = useState<[string, string]>(
    collection ? [collection.cover.gradient[0], collection.cover.gradient[1]] : ["#0B4634", "#17795E"],
  );
  const [arabic, setArabic] = useState(collection?.cover.arabic ?? "");
  const [featured, setFeatured] = useState(collection?.featured ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const save = async () => {
    if (!titleEn.trim()) {
      setTitleError("English title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await admin.upsertCollection(
        getClient(),
        {
          title: { en: titleEn.trim(), ...(titleHa.trim() ? { ha: titleHa.trim() } : {}) },
          kind,
          language,
          cover: { gradient, ...(arabic.trim() ? { arabic: arabic.trim() } : {}) },
          ...(descEn.trim() ? { description: { en: descEn.trim() } } : {}),
          featured,
          ...(collection?.position != null ? { position: collection.position } : {}),
        },
        collection?.id,
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  // Step 1 gates on the required English title before advancing; the last step submits.
  const onNext = () => {
    if (step === 1) {
      if (!titleEn.trim()) {
        setTitleError("English title is required.");
        return;
      }
      next();
      return;
    }
    void save();
  };

  return (
    <Modal
      title={collection ? "Edit collection" : "New collection"}
      subtitle="A body of lectures — occasion, series or topic"
      onClose={onClose}
      stepper={<Stepper steps={["Details", "Appearance"]} current={step} />}
      footer={
        <StepperFooter
          current={step}
          total={2}
          onBack={back}
          onNext={onNext}
          finalLabel={collection ? "Save changes" : "Create collection"}
          busy={busy}
        />
      }
    >
      {step === 1 ? (
        <>
          <BilingualField
            label="TITLE"
            en={titleEn}
            ha={titleHa}
            onEn={(v) => {
              setTitleEn(v);
              setTitleError(null);
            }}
            onHa={setTitleHa}
            placeholder="e.g. Ashura"
            errorEn={titleError}
          />
          <div style={{ marginTop: 18 }}>
            <div style={fieldLabel}>KIND</div>
            <div style={{ display: "flex", gap: 10 }}>
              {COLLECTION_KINDS.map((k) => {
                const on = k === kind;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    style={{ ...radio, ...(on ? radioOn : null) }}
                  >
                    {KIND_LABELS[k]}
                  </button>
                );
              })}
            </div>
          </div>
          <SelectField
            label="LANGUAGE"
            value={language}
            onChange={(v) => setLanguage(v as Language)}
            options={LANGUAGES.map((l) => ({ value: l, label: l === "ha" ? "Hausa" : "English" }))}
          />
          <TextArea
            label="DESCRIPTION (OPTIONAL)"
            value={descEn}
            onChange={setDescEn}
            rows={3}
            placeholder="Short description shown on the app…"
          />
        </>
      ) : (
        <>
          <GradientPicker label="COVER GRADIENT" value={gradient} onChange={setGradient} arabic={arabic} onArabic={setArabic} />
          <div
            role="switch"
            aria-checked={featured}
            tabIndex={0}
            onClick={() => setFeatured((f) => !f)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setFeatured((f) => !f);
              }
            }}
            style={{ ...swrow, marginTop: 18 }}
          >
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Feature on app Home</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Show this collection in the featured rail</div>
            </div>
            <div style={{ ...toggleTrack, background: featured ? brand.green : "var(--line-2)" }}>
              <span style={{ ...toggleKnob, left: featured ? 21 : 3 }} />
            </div>
          </div>
        </>
      )}
      {error ? <div style={errorText}>{error}</div> : null}
    </Modal>
  );
}

const fieldLabel: CSSProperties = { fontSize: 12.5, fontWeight: 500, color: "var(--muted)", marginBottom: 8 };
const radio: CSSProperties = {
  flex: 1,
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-md)",
  padding: 13,
  textAlign: "center",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
  color: "var(--muted)",
  background: "var(--field)",
  cursor: "pointer",
};
const radioOn: CSSProperties = {
  borderColor: "var(--green-bright)",
  background: "var(--green-soft)",
  color: "var(--green-2)",
  boxShadow: "0 0 0 2px rgba(23,121,94,.1)",
};
const swrow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 15px",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--field)",
  cursor: "pointer",
};
const toggleTrack: CSSProperties = { position: "relative", width: 44, height: 26, borderRadius: 999, flexShrink: 0, transition: "background 160ms" };
const toggleKnob: CSSProperties = { position: "absolute", top: 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.25)", transition: "left 160ms" };
const errorText: CSSProperties = { fontSize: 12.5, color: "#a23e3e", marginTop: 16, fontWeight: 600 };
