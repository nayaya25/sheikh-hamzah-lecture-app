"use client";

import { useState } from "react";
import { admin } from "@althaqalayn/api";
import { SERIES_KINDS, type Language, type Series, type SeriesKind } from "@althaqalayn/types";
import { Drawer, Field, Label, inp, sel, Toggle } from "@/components/form";
import { getClient } from "@/lib/supabase";
import { coverGradient, YEARS as YEAR_RANGE } from "@/lib/ui";

const YEARS = [...YEAR_RANGE, "Ongoing"];
const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

export function SeriesEditor({
  series,
  programs,
  onClose,
  onSaved,
}: {
  series: Series | null;
  programs: [string, string][];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titleEn, setTitleEn] = useState(series ? pick(series.title) : "");
  const [titleHa, setTitleHa] = useState(series?.title.ha ?? "");
  const [kind, setKind] = useState<SeriesKind>(series?.kind ?? "occasion");
  const [year, setYear] = useState(series?.year ?? YEARS[0]);
  const [occasion, setOccasion] = useState(series?.occasion ?? "");
  const [language, setLanguage] = useState<Language>(series?.language ?? "ha");
  const [programId, setProgramId] = useState(series?.programId ?? "");
  const [from, setFrom] = useState(series?.cover.gradient[0] ?? "#0B4634");
  const [to, setTo] = useState(series?.cover.gradient[1] ?? "#17795E");
  const [motif, setMotif] = useState(series?.cover.arabic ?? "");
  const [descEn, setDescEn] = useState(series?.description?.en ?? "");
  const [featured, setFeatured] = useState(series?.featured ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!titleEn.trim()) return setError("English title is required.");
    setBusy(true);
    try {
      await admin.upsertSeries(
        getClient(),
        {
          ...(programId ? { programId } : {}),
          title: { en: titleEn.trim(), ...(titleHa.trim() ? { ha: titleHa.trim() } : {}) },
          kind,
          ...(year ? { year } : {}),
          ...(kind === "occasion" && occasion.trim() ? { occasion: occasion.trim() } : {}),
          language,
          cover: { gradient: [from, to], ...(motif.trim() ? { arabic: motif.trim() } : {}) },
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

  return (
    <Drawer
      title={series ? "Edit series" : "New series"}
      sub="A per-year collection of episodes"
      onClose={onClose}
      onSave={save}
      saveLabel={busy ? "Saving…" : "Save series"}
      busy={busy}
      error={error}
    >
      <Field label="TITLE (ENGLISH)">
        <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Ramadan Tafsīr 1446" style={inp} />
      </Field>
      <Field label="TITLE (HAUSA)">
        <input value={titleHa} onChange={(e) => setTitleHa(e.target.value)} placeholder="Optional" style={inp} />
      </Field>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <Label>KIND</Label>
          <select value={kind} onChange={(e) => setKind(e.target.value as SeriesKind)} style={sel}>
            {SERIES_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div style={{ width: 170 }}>
          <Label>YEAR</Label>
          <select value={year} onChange={(e) => setYear(e.target.value)} style={sel}>
            {(year && !YEARS.includes(year) ? [year, ...YEARS] : YEARS).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {kind === "occasion" ? (
        <Field label="OCCASION LABEL">
          <input value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="RAMADAN TAFSIR" style={inp} />
        </Field>
      ) : null}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <Label>PROGRAM (OPTIONAL)</Label>
          <select value={programId} onChange={(e) => setProgramId(e.target.value)} style={sel}>
            <option value="">— None —</option>
            {programs.map(([id, title]) => (
              <option key={id} value={id}>{title}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <Label>LANGUAGE</Label>
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} style={sel}>
            <option value="ha">Hausa</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <Field label="COVER">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input type="color" value={from} onChange={(e) => setFrom(e.target.value)} style={styles.color} aria-label="Gradient from" />
          <input type="color" value={to} onChange={(e) => setTo(e.target.value)} style={styles.color} aria-label="Gradient to" />
          <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif (تفسير)" style={{ ...inp, flex: 1 }} />
          <div style={{ width: 60, height: 44, borderRadius: 10, background: coverGradient(from, to), display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.85)", fontSize: 18 }}>
            {motif}
          </div>
        </div>
      </Field>

      <Field label="DESCRIPTION">
        <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={3} placeholder="What this series covers…" style={{ ...inp, resize: "vertical" }} />
      </Field>

      <div style={styles.featuredRow}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Featured on Home</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>Show in the app’s Featured rail</div>
        </div>
        <Toggle on={featured} onToggle={() => setFeatured((f) => !f)} />
      </div>
    </Drawer>
  );
}

const styles = {
  color: { width: 44, height: 44, border: "1px solid var(--line)", borderRadius: 10, background: "transparent", cursor: "pointer", padding: 2 },
  featuredRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    background: "var(--input)",
    border: "1px solid var(--line)",
    borderRadius: 12,
    padding: 14,
  },
} as const;
