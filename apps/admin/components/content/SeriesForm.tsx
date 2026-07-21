"use client";

import { useRef, useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import { LANGUAGES, SERIES_KINDS, type Language, type SeriesKind } from "@althaqalayn/types";
import { GradientPicker, ParentPicker, SelectField, TextArea, BilingualField, TextField } from "@/components/fields";
import { SectionedForm, type FormSection } from "@/components/SectionedForm";
import { getClient } from "@/lib/supabase";
import { brand, mediaBadge, statusPill, YEARS } from "@/lib/ui";
import { ActionMenu } from "@/components/ActionMenu";
import { useConfirm } from "@/components/ConfirmProvider";
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
  onEditEpisode,
  onAddEpisode,
  onAddMultiple,
  onEpisodesChanged,
}: {
  series: SeriesNode | null;
  programId?: string;
  programs: { value: string; label: string }[];
  onCancel: () => void;
  onSaved: () => void;
  onCreateProgram: (name: string) => Promise<string>;
  onEditEpisode?: (id: string) => void;
  onAddEpisode?: (seriesId: string) => void;
  onAddMultiple?: (seriesId: string) => void;
  onEpisodesChanged?: () => void;
}) {
  const { confirm } = useConfirm();
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
  const [eps, setEps] = useState(series?.episodes ?? []);
  const titleRef = useRef<HTMLDivElement>(null);

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...eps];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setEps(next);
    await admin.setEpisodeNumbers(getClient(), next.map((e) => e.id));
    onEpisodesChanged?.();
  };
  const removeEp = async (id: string, title: string) => {
    if (!(await confirm({ title: `Delete episode “${title}”?`, danger: true, confirmLabel: "Delete" }))) return;
    await admin.deleteLecture(getClient(), id);
    setEps((cur) => cur.filter((e) => e.id !== id));
    onEpisodesChanged?.();
  };

  const save = async () => {
    if (!titleEn.trim()) { setTitleError("English title is required."); titleRef.current?.scrollIntoView({ block: "center" }); return; }
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
          <div ref={titleRef}>
            <BilingualField label="TITLE" en={titleEn} ha={titleHa} onEn={(v) => { setTitleEn(v); setTitleError(null); }} onHa={setTitleHa} placeholder="Series title" errorEn={titleError} />
          </div>
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
    ...(series
      ? [{
          key: "episodes",
          title: `Episodes (${eps.length})`,
          render: () => (
            <div>
              {eps.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>No episodes yet.</div> : null}
              {eps.map((e, i) => {
                const badge = mediaBadge(e.type);
                const pill = statusPill(e.status);
                return (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button type="button" onClick={() => void move(i, -1)} disabled={i === 0} style={reorderBtn}>▲</button>
                      <button type="button" onClick={() => void move(i, 1)} disabled={i === eps.length - 1} style={reorderBtn}>▼</button>
                    </div>
                    <span style={{ width: 22, fontWeight: 800, fontSize: 12, color: brand.greenMid }}>{e.episode ?? i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title.en}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, borderRadius: 5, padding: "2px 6px", background: badge.bg, color: badge.fg }}>{e.type.toUpperCase()}</span>
                        <span style={{ fontSize: 9.5, fontWeight: 800, borderRadius: 20, padding: "2px 8px", background: pill.bg, color: pill.fg }}>{pill.label}</span>
                      </div>
                    </div>
                    <ActionMenu items={[
                      { label: "Edit", onSelect: () => onEditEpisode?.(e.id) },
                      { label: "Delete", onSelect: () => void removeEp(e.id, e.title.en), danger: true },
                    ]} />
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button type="button" onClick={() => onAddEpisode?.(series.id)} style={addBtn}>+ Add episode</button>
                <button type="button" onClick={() => onAddMultiple?.(series.id)} style={addBtnGhost}>+ Add multiple</button>
              </div>
            </div>
          ),
        }]
      : []),
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

const reorderBtn: CSSProperties = { background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 9, lineHeight: 1, padding: 0 };
const addBtn: CSSProperties = { background: brand.green, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
const addBtnGhost: CSSProperties = { background: "transparent", color: brand.greenMid, border: "1.5px solid var(--line)", borderRadius: 10, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
