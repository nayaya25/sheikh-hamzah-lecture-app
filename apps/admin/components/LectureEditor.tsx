"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { admin, mapSeries, unwrap, type SeriesRow } from "@althaqalayn/api";
import type { Language, Lecture, LectureScope, MediaType, Series } from "@althaqalayn/types";
import { getClient } from "@/lib/supabase";
import { brand, font } from "@/lib/ui";

const YEARS = ["1446 AH · 2025", "1445 AH · 2024", "1444 AH · 2023", "1443 AH · 2022", "Ongoing"];
const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

/** Right-hand drawer to create or edit a lecture. `lecture` null = new. */
export function LectureEditor({
  lecture,
  onClose,
  onSaved,
}: {
  lecture: Lecture | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [series, setSeries] = useState<Series[]>([]);
  const [titleEn, setTitleEn] = useState(lecture ? pick(lecture.title) : "");
  const [titleHa, setTitleHa] = useState(lecture?.title.ha ?? "");
  const [scope, setScope] = useState<LectureScope>(lecture?.scope ?? "series");
  const [year, setYear] = useState(lecture?.year ?? YEARS[0]);
  const [seriesId, setSeriesId] = useState(lecture?.seriesId ?? "");
  const [programId, setProgramId] = useState(lecture?.programId ?? "");
  const [episode, setEpisode] = useState(lecture?.episode?.toString() ?? "");
  const [type, setType] = useState<MediaType>(lecture?.type ?? "audio");
  const [language, setLanguage] = useState<Language>(lecture?.language ?? "ha");
  const [mediaUrl, setMediaUrl] = useState(lecture?.mediaUrl ?? "");
  const [durationMin, setDurationMin] = useState(lecture?.duration ? String(Math.round(lecture.duration / 60)) : "");
  const [date, setDate] = useState(lecture?.date ?? new Date().toISOString().slice(0, 10));
  const [descEn, setDescEn] = useState(lecture?.description?.en ?? "");
  const [bodyEn, setBodyEn] = useState(lecture?.body?.en ?? "");
  const [publishNow, setPublishNow] = useState(lecture ? lecture.status === "published" : true);
  const [scheduleFor, setScheduleFor] = useState(
    lecture?.scheduledFor ? lecture.scheduledFor.slice(0, 16) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await getClient().from("series").select("*").order("position");
        setSeries(unwrap<SeriesRow[]>(r).map((row) => mapSeries(row)));
      } catch {
        // leave series empty; selects just won't populate
      }
    })();
  }, []);

  const programs = useMemo(() => {
    // Distinct programs referenced by the loaded series (id → a representative title).
    const map = new Map<string, string>();
    for (const s of series) if (s.programId) map.set(s.programId, pick(s.title));
    return [...map.entries()];
  }, [series]);

  const save = async () => {
    setError(null);
    if (!titleEn.trim()) {
      setError("English title is required.");
      return;
    }
    setBusy(true);
    try {
      const chosenSeries = series.find((s) => s.id === seriesId);
      const status = publishNow ? "published" : scheduleFor ? "scheduled" : "draft";
      const input = {
        title: { en: titleEn.trim(), ...(titleHa.trim() ? { ha: titleHa.trim() } : {}) },
        type,
        scope,
        language,
        date,
        status: status as Lecture["status"],
        ...(year ? { year } : {}),
        ...(descEn.trim() ? { description: { en: descEn.trim() } } : {}),
        ...(type === "text" && bodyEn.trim() ? { body: { en: bodyEn.trim() } } : {}),
        ...(mediaUrl.trim() ? { mediaUrl: mediaUrl.trim() } : {}),
        ...(durationMin ? { duration: Math.round(Number(durationMin) * 60) } : {}),
        ...(!publishNow && scheduleFor ? { scheduledFor: new Date(scheduleFor).toISOString() } : {}),
        ...(scope === "series"
          ? {
              ...(seriesId ? { seriesId } : {}),
              ...(chosenSeries?.programId ? { programId: chosenSeries.programId } : {}),
              ...(episode ? { episode: Number(episode) } : {}),
            }
          : { ...(programId ? { programId } : {}) }),
      };
      await admin.upsertLecture(getClient(), input, lecture?.id);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const seg = (active: boolean): CSSProperties => ({
    flex: 1,
    textAlign: "center",
    padding: 10,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: active ? 700 : 600,
    cursor: "pointer",
    border: active ? "none" : "1px solid var(--line)",
    background: active ? brand.green : "var(--chip)",
    color: active ? "#fff" : "var(--muted)",
  });

  return (
    <>
      <div style={styles.scrim} onClick={onClose} />
      <div style={styles.drawer}>
        <div style={styles.header}>
          <div>
            <div style={styles.h1}>{lecture ? "Edit lecture" : "New lecture"}</div>
            <div style={styles.sub}>{lecture ? "Update and re-publish" : "Add a lecture to the archive"}</div>
          </div>
          <button onClick={onClose} style={styles.close} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="noscroll" style={styles.body}>
          <Field label="TITLE (ENGLISH)">
            <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Lecture title" style={inp} />
          </Field>
          <Field label="TITLE (HAUSA)">
            <input value={titleHa} onChange={(e) => setTitleHa(e.target.value)} placeholder="Sunan lacca da Hausa" style={inp} />
          </Field>

          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <Label>LECTURE TYPE</Label>
              <div style={{ display: "flex", gap: 8 }}>
                <div onClick={() => setScope("series")} style={seg(scope === "series")}>Series</div>
                <div onClick={() => setScope("single")} style={seg(scope === "single")}>Single</div>
              </div>
            </div>
            <div style={{ width: 150 }}>
              <Label>YEAR</Label>
              <select value={year} onChange={(e) => setYear(e.target.value)} style={sel}>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            {scope === "series" ? (
              <>
                <div style={{ flex: 1 }}>
                  <Label>SERIES</Label>
                  <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} style={sel}>
                    <option value="">— Select —</option>
                    {series.map((s) => (
                      <option key={s.id} value={s.id}>{pick(s.title)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ width: 96 }}>
                  <Label>EPISODE</Label>
                  <input value={episode} onChange={(e) => setEpisode(e.target.value)} placeholder="12" inputMode="numeric" style={inp} />
                </div>
              </>
            ) : (
              <div style={{ flex: 1 }}>
                <Label>PROGRAM (OPTIONAL)</Label>
                <select value={programId} onChange={(e) => setProgramId(e.target.value)} style={sel}>
                  <option value="">— None —</option>
                  {programs.map(([id, title]) => (
                    <option key={id} value={id}>{title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <Label>MEDIA TYPE</Label>
              <select value={type} onChange={(e) => setType(e.target.value as MediaType)} style={sel}>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
                <option value="text">Text</option>
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

          {type !== "text" ? (
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <div style={{ flex: 1 }}>
                <Label>MEDIA URL</Label>
                <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://cdn/…/audio.mp3" style={inp} />
              </div>
              <div style={{ width: 110 }}>
                <Label>LENGTH (MIN)</Label>
                <input value={durationMin} onChange={(e) => setDurationMin(e.target.value)} placeholder="41" inputMode="numeric" style={inp} />
              </div>
            </div>
          ) : null}

          <Field label="DATE">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
          </Field>

          <Field label="DESCRIPTION">
            <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={3} placeholder="Short summary shown on the lecture page…" style={{ ...inp, resize: "vertical" }} />
          </Field>

          {type === "text" ? (
            <Field label="READER BODY (ENGLISH)">
              <textarea value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} rows={4} placeholder="The full text shown in the reader…" style={{ ...inp, resize: "vertical" }} />
            </Field>
          ) : null}

          <div style={styles.pubRow}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Publish immediately</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                {publishNow ? "Goes live in the app now" : "Save as draft or schedule below"}
              </div>
            </div>
            <button
              onClick={() => setPublishNow((p) => !p)}
              style={{ ...styles.track, background: publishNow ? brand.green : "#d5cdb8" }}
              aria-label="Toggle publish"
            >
              <span style={{ ...styles.knob, left: publishNow ? 21 : 3 }} />
            </button>
          </div>

          {!publishNow ? (
            <Field label="SCHEDULE FOR (OPTIONAL)">
              <input type="datetime-local" value={scheduleFor} onChange={(e) => setScheduleFor(e.target.value)} style={inp} />
            </Field>
          ) : null}

          {error ? <div style={styles.error}>{error}</div> : null}
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancel}>Cancel</button>
          <button onClick={save} disabled={busy} style={styles.saveBtn}>
            {busy ? "Saving…" : publishNow ? "Publish" : scheduleFor ? "Schedule" : "Save draft"}
          </button>
        </div>
      </div>
    </>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <div style={styles.label}>{children}</div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

const inp: CSSProperties = {
  width: "100%",
  border: "1.5px solid var(--line)",
  borderRadius: 10,
  padding: "11px 13px",
  fontSize: 13.5,
  background: "var(--input)",
  outline: "none",
};
const sel: CSSProperties = { ...inp, cursor: "pointer" };

const styles: Record<string, CSSProperties> = {
  scrim: { position: "fixed", inset: 0, zIndex: 50, background: "rgba(20,30,26,.4)" },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 51,
    width: 472,
    maxWidth: "100vw",
    background: "var(--card)",
    boxShadow: "-14px 0 40px rgba(0,0,0,.16)",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "22px 24px",
    borderBottom: "1px solid var(--line)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  h1: { fontFamily: font.heading, fontSize: 19, fontWeight: 600 },
  sub: { fontSize: 12, color: "var(--muted)", marginTop: 2 },
  close: { background: "transparent", border: "none", fontSize: 18, color: "var(--muted)", cursor: "pointer" },
  body: { flex: 1, overflowY: "auto", padding: 24 },
  label: { fontSize: 11, fontWeight: 800, letterSpacing: ".5px", color: "var(--faint)", marginBottom: 7 },
  pubRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    background: "var(--input)",
    border: "1px solid var(--line)",
    borderRadius: 12,
    padding: 14,
  },
  track: { position: "relative", width: 44, height: 26, borderRadius: 13, border: "none", cursor: "pointer", flexShrink: 0 },
  knob: { position: "absolute", top: 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .15s" },
  error: { color: "#a23e3e", fontSize: 12.5, marginTop: 14 },
  footer: { padding: "16px 24px", borderTop: "1px solid var(--line)", display: "flex", gap: 12 },
  cancel: {
    flex: 1,
    textAlign: "center",
    border: "1.5px solid var(--line)",
    background: "transparent",
    borderRadius: 11,
    padding: 13,
    fontSize: 13.5,
    fontWeight: 700,
    color: "var(--muted)",
    cursor: "pointer",
    fontFamily: font.ui,
  },
  saveBtn: {
    flex: 1.4,
    textAlign: "center",
    background: brand.green,
    color: "#fff",
    border: "none",
    borderRadius: 11,
    padding: 13,
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: font.ui,
  },
};
