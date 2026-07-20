"use client";

import { useState } from "react";
import { admin } from "@althaqalayn/api";
import { LANGUAGES, SERIES_KINDS, type Language, type SeriesKind } from "@althaqalayn/types";
import { GradientPicker, ParentPicker, SelectField, TextArea, BilingualField, TextField } from "@/components/fields";
import { SectionedForm, type FormSection } from "@/components/SectionedForm";
import { getClient } from "@/lib/supabase";
import { YEARS } from "@/lib/ui";
import { EditorFooter } from "./EditorFooter";
import type { SeriesNode } from "@/lib/useContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";
const KIND_LABELS: Record<SeriesKind, string> = { recency: "Recency (latest)", occasion: "Occasion", topic: "Topic", book: "Book / text" };

export function SeriesForm({
  series,
  programId,
  programs,
  onCancel,
  onSaved,
  onCreateProgram,
}: {
  series: SeriesNode | null;
  programId?: string;
  programs: { value: string; label: string }[];
  onCancel: () => void;
  onSaved: () => void;
  onCreateProgram: (name: string) => Promise<string>;
}) {
  const [titleEn, setTitleEn] = useState(series ? pick(series.title) : "");
  const [titleHa, setTitleHa] = useState(series?.title.ha ?? "");
  const [parent, setParent] = useState(series?.programId ?? programId ?? "");
  const [kind, setKind] = useState<SeriesKind>(series?.kind ?? "recency");
  const [year, setYear] = useState(series?.year ?? YEARS[0]);
  const [occasion, setOccasion] = useState(series?.occasion ?? "");
  const [language, setLanguage] = useState<Language>(series?.language ?? "ha");
  const [gradient, setGradient] = useState<[string, string]>(series ? [series.cover.gradient[0], series.cover.gradient[1]] : ["#0B4634", "#17795E"]);
  const [arabic, setArabic] = useState(series?.cover.arabic ?? "");
  const [descEn, setDescEn] = useState(series?.description?.en ?? "");
  const [featured, setFeatured] = useState(series?.featured ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const save = async () => {
    if (!titleEn.trim()) { setTitleError("English title is required."); return; }
    setBusy(true); setError(null);
    try {
      await admin.upsertSeries(
        getClient(),
        {
          ...(parent ? { programId: parent } : {}),
          title: { en: titleEn.trim(), ...(titleHa.trim() ? { ha: titleHa.trim() } : {}) },
          kind,
          ...(year ? { year } : {}),
          ...(kind === "occasion" && occasion.trim() ? { occasion: occasion.trim() } : {}),
          language,
          cover: { gradient, ...(arabic.trim() ? { arabic: arabic.trim() } : {}) },
          ...(descEn.trim() ? { description: { en: descEn.trim() } } : {}),
          featured,
        },
        series?.id,
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
          <BilingualField label="TITLE" en={titleEn} ha={titleHa} onEn={(v) => { setTitleEn(v); setTitleError(null); }} onHa={setTitleHa} placeholder="Series title" errorEn={titleError} />
          <ParentPicker label="PROGRAM" value={parent} onChange={setParent} options={programs} onCreate={onCreateProgram} allowNone />
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <SelectField label="KIND" value={kind} onChange={(v) => setKind(v as SeriesKind)} options={SERIES_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))} />
            </div>
            <div style={{ flex: 1 }}>
              <SelectField label="YEAR" value={year} onChange={setYear} options={(year && !YEARS.includes(year) ? [year, ...YEARS] : YEARS).map((y) => ({ value: y, label: y }))} />
            </div>
          </div>
          {kind === "occasion" ? <TextField label="OCCASION LABEL" value={occasion} onChange={setOccasion} placeholder="Maulud, Ashura…" /> : null}
          <SelectField label="LANGUAGE" value={language} onChange={(v) => setLanguage(v as Language)} options={LANGUAGES.map((l) => ({ value: l, label: l === "ha" ? "Hausa" : "English" }))} />
          <TextArea label="DESCRIPTION" value={descEn} onChange={setDescEn} rows={3} />
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
            Feature on the Home “Featured series” rail
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
        footer={<EditorFooter busy={busy} saveLabel={series ? "Save changes" : "Create series"} onCancel={onCancel} onSave={() => void save()} />}
      />
    </div>
  );
}
