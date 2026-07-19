"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { admin, mapSeries, unwrap, type SeriesRow } from "@althaqalayn/api";
import type { Language, Lecture, LectureScope, MediaType, Series } from "@althaqalayn/types";
import { MediaPreview } from "@/components/MediaPreview";
import { MediaUploadField } from "@/components/MediaUploadField";
import { getClient } from "@/lib/supabase";
import { brand, font } from "@/lib/ui";
import { deleteMedia, storagePathFromUrl, uploadMedia } from "@/lib/upload";

const YEARS = ["1446 AH · 2025", "1445 AH · 2024", "1444 AH · 2023", "1443 AH · 2022", "Ongoing"];
const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

interface EpisodeDraft {
  key: number;
  titleEn: string;
  titleHa: string;
  episode: string;
  mediaUrl: string;
  uploadName: string;
  durationMin: string;
  bodyEn: string;
  uploading: boolean;
}

const emptyEpisode = (key: number, episode = ""): EpisodeDraft => ({
  key,
  titleEn: "",
  titleHa: "",
  episode,
  mediaUrl: "",
  uploadName: "",
  durationMin: "",
  bodyEn: "",
  uploading: false,
});

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

  // shared / common
  const [scope, setScope] = useState<LectureScope>(lecture?.scope ?? "series");
  const [year, setYear] = useState(lecture?.year ?? YEARS[0]);
  const [seriesId, setSeriesId] = useState(lecture?.seriesId ?? "");
  const [programId, setProgramId] = useState(lecture?.programId ?? "");
  const [type, setType] = useState<MediaType>(lecture?.type ?? "audio");
  const [language, setLanguage] = useState<Language>(lecture?.language ?? "ha");
  const [date, setDate] = useState(lecture?.date ?? new Date().toISOString().slice(0, 10));
  const [publishNow, setPublishNow] = useState(lecture ? lecture.status === "published" : true);
  const [scheduleFor, setScheduleFor] = useState(lecture?.scheduledFor ? lecture.scheduledFor.slice(0, 16) : "");

  // single-lecture fields
  const [titleEn, setTitleEn] = useState(lecture ? pick(lecture.title) : "");
  const [titleHa, setTitleHa] = useState(lecture?.title.ha ?? "");
  const [episode, setEpisode] = useState(lecture?.episode?.toString() ?? "");
  const [mediaUrl, setMediaUrl] = useState(lecture?.mediaUrl ?? "");
  const [uploadName, setUploadName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [durationMin, setDurationMin] = useState(lecture?.duration ? String(Math.round(lecture.duration / 60)) : "");
  const [descEn, setDescEn] = useState(lecture?.description?.en ?? "");
  const [bodyEn, setBodyEn] = useState(lecture?.body?.en ?? "");

  // batch (new series) fields
  const [episodes, setEpisodes] = useState<EpisodeDraft[]>([emptyEpisode(0, "1")]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBatch = !lecture && scope === "series";

  useEffect(() => {
    void (async () => {
      try {
        const r = await getClient().from("series").select("*").order("position");
        setSeries(unwrap<SeriesRow[]>(r).map((row) => mapSeries(row)));
      } catch {
        // selects just won't populate
      }
    })();
  }, []);

  const programs = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of series) if (s.programId) map.set(s.programId, pick(s.title));
    return [...map.entries()];
  }, [series]);

  const chosenSeries = series.find((s) => s.id === seriesId);

  // ── single upload ────────────────────────────────────────────────────────
  const onSingleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const { url } = await uploadMedia(file);
      const old = storagePathFromUrl(mediaUrl);
      if (old) await deleteMedia(old);
      setMediaUrl(url);
      setUploadName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ── batch helpers ────────────────────────────────────────────────────────
  const patchEpisode = (key: number, patch: Partial<EpisodeDraft>) =>
    setEpisodes((eps) => eps.map((e) => (e.key === key ? { ...e, ...patch } : e)));

  const addEpisode = () =>
    setEpisodes((eps) => {
      const nextNum = String((Math.max(0, ...eps.map((e) => Number(e.episode) || 0)) || eps.length) + 1);
      return [...eps, emptyEpisode((eps.at(-1)?.key ?? 0) + 1, nextNum)];
    });

  const removeEpisode = (key: number) => setEpisodes((eps) => (eps.length > 1 ? eps.filter((e) => e.key !== key) : eps));

  const onEpisodeFile = async (key: number, file: File) => {
    setError(null);
    patchEpisode(key, { uploading: true });
    try {
      const { url } = await uploadMedia(file);
      patchEpisode(key, { mediaUrl: url, uploadName: file.name, uploading: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      patchEpisode(key, { uploading: false });
    }
  };

  const status = (): Lecture["status"] => (publishNow ? "published" : scheduleFor ? "scheduled" : "draft");
  const sharedInput = () => ({
    type,
    language,
    date,
    status: status(),
    ...(year ? { year } : {}),
    ...(!publishNow && scheduleFor ? { scheduledFor: new Date(scheduleFor).toISOString() } : {}),
  });

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      const client = getClient();
      if (isBatch) {
        const valid = episodes.filter((e) => e.titleEn.trim());
        if (!valid.length) throw new Error("Add at least one episode with a title.");
        await Promise.all(
          valid.map((e) =>
            admin.upsertLecture(client, {
              ...sharedInput(),
              scope: "series",
              title: { en: e.titleEn.trim(), ...(e.titleHa.trim() ? { ha: e.titleHa.trim() } : {}) },
              ...(type === "text" && e.bodyEn.trim() ? { body: { en: e.bodyEn.trim() } } : {}),
              ...(type !== "text" && e.mediaUrl ? { mediaUrl: e.mediaUrl } : {}),
              ...(e.durationMin ? { duration: Math.round(Number(e.durationMin) * 60) } : {}),
              ...(seriesId ? { seriesId } : {}),
              ...(chosenSeries?.programId ? { programId: chosenSeries.programId } : {}),
              ...(e.episode ? { episode: Number(e.episode) } : {}),
            }),
          ),
        );
      } else {
        if (!titleEn.trim()) throw new Error("English title is required.");
        await admin.upsertLecture(
          client,
          {
            ...sharedInput(),
            scope,
            title: { en: titleEn.trim(), ...(titleHa.trim() ? { ha: titleHa.trim() } : {}) },
            ...(descEn.trim() ? { description: { en: descEn.trim() } } : {}),
            ...(type === "text" && bodyEn.trim() ? { body: { en: bodyEn.trim() } } : {}),
            ...(type !== "text" && mediaUrl ? { mediaUrl } : {}),
            ...(durationMin ? { duration: Math.round(Number(durationMin) * 60) } : {}),
            ...(scope === "series"
              ? {
                  ...(seriesId ? { seriesId } : {}),
                  ...(chosenSeries?.programId ? { programId: chosenSeries.programId } : {}),
                  ...(episode ? { episode: Number(episode) } : {}),
                }
              : { ...(programId ? { programId } : {}) }),
          },
          lecture?.id,
        );
      }
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

  const saveLabel = busy
    ? "Saving…"
    : isBatch
      ? `${publishNow ? "Publish" : "Save"} ${episodes.filter((e) => e.titleEn.trim()).length || ""} episode(s)`.trim()
      : publishNow
        ? "Publish"
        : scheduleFor
          ? "Schedule"
          : "Save draft";

  return (
    <>
      <div style={styles.scrim} onClick={onClose} />
      <div style={styles.drawer}>
        <div style={styles.header}>
          <div>
            <div style={styles.h1}>{lecture ? "Edit lecture" : isBatch ? "New episodes" : "New lecture"}</div>
            <div style={styles.sub}>
              {lecture ? "Update and re-publish" : isBatch ? "Add several episodes to a series at once" : "Add a lecture to the archive"}
            </div>
          </div>
          <button onClick={onClose} style={styles.close} aria-label="Close">✕</button>
        </div>

        <div className="noscroll" style={styles.body}>
          {/* Scope toggle (new lectures only) */}
          {!lecture ? (
            <div>
              <Label>LECTURE TYPE</Label>
              <div style={{ display: "flex", gap: 8 }}>
                <div onClick={() => setScope("series")} style={seg(scope === "series")}>Series (multiple)</div>
                <div onClick={() => setScope("single")} style={seg(scope === "single")}>Single</div>
              </div>
            </div>
          ) : null}

          {/* Shared: series/program + year */}
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            {scope === "series" ? (
              <div style={{ flex: 1 }}>
                <Label>SERIES</Label>
                <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} style={sel}>
                  <option value="">— Select —</option>
                  {series.map((s) => (
                    <option key={s.id} value={s.id}>{pick(s.title)}</option>
                  ))}
                </select>
              </div>
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
            <div style={{ width: 150 }}>
              <Label>YEAR</Label>
              <select value={year} onChange={(e) => setYear(e.target.value)} style={sel}>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Shared: media type + language */}
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

          <Field label="DATE">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inp, width: 200 }} />
          </Field>

          {isBatch ? (
            /* ── Batch episodes ── */
            <div style={{ marginTop: 20 }}>
              <Label>EPISODES</Label>
              {episodes.map((ep, i) => (
                <div key={ep.key} style={styles.epCard}>
                  <div style={styles.epHead}>
                    <span style={styles.epNum}>Episode {ep.episode || i + 1}</span>
                    {episodes.length > 1 ? (
                      <button onClick={() => removeEpisode(ep.key)} style={styles.epRemove}>Remove</button>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input value={ep.titleEn} onChange={(e) => patchEpisode(ep.key, { titleEn: e.target.value })} placeholder="Title (English)" style={{ ...inp, flex: 1 }} />
                    <input value={ep.episode} onChange={(e) => patchEpisode(ep.key, { episode: e.target.value })} placeholder="#" inputMode="numeric" style={{ ...inp, width: 64 }} />
                  </div>
                  <input value={ep.titleHa} onChange={(e) => patchEpisode(ep.key, { titleHa: e.target.value })} placeholder="Title (Hausa)" style={{ ...inp, marginTop: 8 }} />
                  <div style={{ marginTop: 10 }}>
                    {type === "text" ? (
                      <>
                        <textarea value={ep.bodyEn} onChange={(e) => patchEpisode(ep.key, { bodyEn: e.target.value })} rows={3} placeholder="Reader body…" style={{ ...inp, resize: "vertical" }} />
                        <div style={{ marginTop: 8 }}><MediaPreview type="text" body={ep.bodyEn} /></div>
                      </>
                    ) : (
                      <MediaUploadField
                        type={type}
                        url={ep.mediaUrl}
                        name={ep.uploadName}
                        uploading={ep.uploading}
                        onFile={(f) => onEpisodeFile(ep.key, f)}
                        compact
                      />
                    )}
                  </div>
                </div>
              ))}
              <button onClick={addEpisode} style={styles.addEp}>+ Add another episode</button>
            </div>
          ) : (
            /* ── Single lecture ── */
            <>
              <Field label="TITLE (ENGLISH)">
                <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Lecture title" style={inp} />
              </Field>
              <Field label="TITLE (HAUSA)">
                <input value={titleHa} onChange={(e) => setTitleHa(e.target.value)} placeholder="Sunan lacca da Hausa" style={inp} />
              </Field>
              {scope === "series" ? (
                <Field label="EPISODE">
                  <input value={episode} onChange={(e) => setEpisode(e.target.value)} placeholder="12" inputMode="numeric" style={{ ...inp, width: 96 }} />
                </Field>
              ) : null}

              {type === "text" ? (
                <>
                  <Field label="READER BODY (ENGLISH)">
                    <textarea value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} rows={5} placeholder="The full text shown in the reader…" style={{ ...inp, resize: "vertical" }} />
                  </Field>
                  <Field label="PREVIEW">
                    <MediaPreview type="text" body={bodyEn} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="MEDIA FILE">
                    <MediaUploadField type={type} url={mediaUrl} name={uploadName} uploading={uploading} onFile={onSingleFile} />
                  </Field>
                  <Field label="LENGTH (MIN, OPTIONAL)">
                    <input value={durationMin} onChange={(e) => setDurationMin(e.target.value)} placeholder="41" inputMode="numeric" style={{ ...inp, width: 140 }} />
                  </Field>
                </>
              )}

              <Field label="DESCRIPTION">
                <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={3} placeholder="Short summary shown on the lecture page…" style={{ ...inp, resize: "vertical" }} />
              </Field>
            </>
          )}

          {/* Publish */}
          <div style={styles.pubRow}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Publish immediately</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                {publishNow ? "Goes live in the app now" : "Save as draft or schedule below"}
              </div>
            </div>
            <button onClick={() => setPublishNow((p) => !p)} style={{ ...styles.track, background: publishNow ? brand.green : "#d5cdb8" }} aria-label="Toggle publish">
              <span style={{ ...styles.knob, left: publishNow ? 21 : 3 }} />
            </button>
          </div>
          {!publishNow ? (
            <Field label="SCHEDULE FOR (OPTIONAL)">
              <input type="datetime-local" value={scheduleFor} onChange={(e) => setScheduleFor(e.target.value)} style={{ ...inp, width: 240 }} />
            </Field>
          ) : null}

          {error ? <div style={styles.error}>{error}</div> : null}
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancel}>Cancel</button>
          <button onClick={save} disabled={busy} style={styles.saveBtn}>{saveLabel}</button>
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
  header: { padding: "22px 24px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" },
  h1: { fontFamily: font.heading, fontSize: 19, fontWeight: 600 },
  sub: { fontSize: 12, color: "var(--muted)", marginTop: 2 },
  close: { background: "transparent", border: "none", fontSize: 18, color: "var(--muted)", cursor: "pointer" },
  body: { flex: 1, overflowY: "auto", padding: 24 },
  label: { fontSize: 11, fontWeight: 800, letterSpacing: ".5px", color: "var(--faint)", marginBottom: 7 },

  epCard: { border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginBottom: 12, background: "var(--bg)" },
  epHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  epNum: { fontSize: 12, fontWeight: 700, color: "var(--ink)" },
  epRemove: { background: "transparent", border: "none", color: "#a23e3e", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  addEp: {
    width: "100%",
    padding: 12,
    border: "1.5px dashed var(--line)",
    borderRadius: 10,
    background: "transparent",
    color: brand.greenMid,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: font.ui,
  },

  pubRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, background: "var(--input)", border: "1px solid var(--line)", borderRadius: 12, padding: 14 },
  track: { position: "relative", width: 44, height: 26, borderRadius: 13, border: "none", cursor: "pointer", flexShrink: 0 },
  knob: { position: "absolute", top: 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .15s" },
  error: { color: "#a23e3e", fontSize: 12.5, marginTop: 14 },
  footer: { padding: "16px 24px", borderTop: "1px solid var(--line)", display: "flex", gap: 12 },
  cancel: { flex: 1, textAlign: "center", border: "1.5px solid var(--line)", background: "transparent", borderRadius: 11, padding: 13, fontSize: 13.5, fontWeight: 700, color: "var(--muted)", cursor: "pointer", fontFamily: font.ui },
  saveBtn: { flex: 1.4, textAlign: "center", background: brand.green, color: "#fff", border: "none", borderRadius: 11, padding: 13, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: font.ui },
};
