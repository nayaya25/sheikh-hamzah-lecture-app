"use client";

import { useRef, useState } from "react";
import { admin } from "@althaqalayn/api";
import { COLLECTION_KINDS, LANGUAGES, type CollectionKind, type Language } from "@althaqalayn/types";
import { BilingualField, GradientPicker, SelectField, TextArea } from "@/components/fields";
import { SectionedForm, type FormSection } from "@/components/SectionedForm";
import { getClient } from "@/lib/supabase";
import { EditorFooter } from "./EditorFooter";
import type { CollectionNode } from "@/lib/useContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";
const KIND_LABELS: Record<CollectionKind, string> = { occasion: "Occasion", series: "Series", topic: "Topic" };

export function CollectionForm({
  collection,
  onCancel,
  onSaved,
}: {
  collection: CollectionNode | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
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
  const titleRef = useRef<HTMLDivElement>(null);

  const save = async () => {
    if (!titleEn.trim()) {
      setTitleError("English title is required.");
      titleRef.current?.scrollIntoView({ block: "center" });
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

  const sections: FormSection[] = [
    {
      key: "details",
      title: "Details",
      render: () => (
        <>
          <div ref={titleRef}>
            <BilingualField
              label="TITLE"
              en={titleEn}
              ha={titleHa}
              onEn={(v) => { setTitleEn(v); setTitleError(null); }}
              onHa={setTitleHa}
              placeholder="Collection title"
              errorEn={titleError}
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <SelectField
                label="KIND"
                value={kind}
                onChange={(v) => setKind(v as CollectionKind)}
                options={COLLECTION_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <SelectField
                label="LANGUAGE"
                value={language}
                onChange={(v) => setLanguage(v as Language)}
                options={LANGUAGES.map((l) => ({ value: l, label: l === "ha" ? "Hausa" : "English" }))}
              />
            </div>
          </div>
          <TextArea label="DESCRIPTION (OPTIONAL)" value={descEn} onChange={setDescEn} rows={3} placeholder="What this collection covers…" />
        </>
      ),
    },
    {
      key: "cover",
      title: "Cover",
      render: () => (
        <>
          <GradientPicker label="COVER" value={gradient} onChange={setGradient} arabic={arabic} onArabic={setArabic} />
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Feature on the Home “Featured” rail
          </label>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 28 }}>
      <SectionedForm
        sections={sections}
        error={error}
        footer={<EditorFooter busy={busy} saveLabel={collection ? "Save changes" : "Create collection"} onCancel={onCancel} onSave={() => void save()} />}
      />
    </div>
  );
}
