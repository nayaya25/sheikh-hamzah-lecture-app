// Sample catalog mirroring design/Althaqalayn Lectures.dc.html — series, lectures,
// and generated episodes. Stand-in until wired to @althaqalayn/api. Episode
// generation reproduces the prototype's logic (Tafsīr → "Night N · Juz N").

import type { MediaType } from "@althaqalayn/types";
import type { Gradient } from "@/lib/sampleData";

export interface SampleSeries {
  id: string;
  kind: string;
  title: string;
  ar: string;
  year: string;
  count: number;
  media: string;
  lang: string;
  gradient: Gradient;
  desc: string;
}

/** A lecture the player can load. Carries display strings + duration in seconds. */
export interface Playable {
  id: string;
  title: string;
  sub: string;
  seriesId: string;
  type: MediaType;
  durSec: number;
  ar: string;
  /** Streamed media source; absent for sample data (falls back to a sim clock). */
  mediaUrl?: string;
}

export const seriesList: SampleSeries[] = [
  { id: "tafsir1445", kind: "RAMADAN TAFSIR", title: "Ramadan Tafsīr 1445", ar: "تفسير", year: "1445 AH · 2024", count: 30, media: "Video & Audio", lang: "Hausa", gradient: ["#0B4634", "#17795E"], desc: "A daily Qur’anic exegesis delivered each evening across the blessed month — verse by verse, night by night." },
  { id: "tafsir1444", kind: "RAMADAN TAFSIR", title: "Ramadan Tafsīr 1444", ar: "تفسير", year: "1444 AH · 2023", count: 30, media: "Audio", lang: "Hausa", gradient: ["#12503f", "#1f7a5e"], desc: "The complete 1444 cycle of daily tafsīr sessions." },
  { id: "maulud1445", kind: "MAULUD", title: "Maulud an-Nabī ﷺ 1445", ar: "مولد", year: "1445 AH", count: 3, media: "Video", lang: "Hausa & English", gradient: ["#7a5a12", "#c0932f"], desc: "Commemorative lectures on the birth, life and noble character of the Prophet ﷺ." },
  { id: "nahj", kind: "BOOK SERIES", title: "Commentary on Nahj al-Balāgha", ar: "نهج", year: "Ongoing", count: 24, media: "Audio", lang: "Hausa", gradient: ["#173a4f", "#2c7396"], desc: "A sustained commentary on the sermons, letters and sayings of Imam Ali (a.s)." },
  { id: "akhlaq", kind: "MORALITY", title: "Ethics of the Self", ar: "أخلاق", year: "2022", count: 12, media: "Audio & Text", lang: "Hausa", gradient: ["#4a2f5e", "#7a4f9c"], desc: "Lessons on purification of the soul, discipline of the self and moral excellence." },
  { id: "society", kind: "SOCIETY & JUSTICE", title: "Society & Justice", ar: "عدل", year: "2021", count: 8, media: "Audio", lang: "English", gradient: ["#5e3a2f", "#a06a4a"], desc: "Reflections on governance, justice, and the responsibilities of the community." },
];

export const lecturesList: Playable[] = [
  { id: "l1", title: "The Meaning of Divine Mercy", sub: "Ramadan Tafsīr 1445 · Night 12", seriesId: "tafsir1445", type: "video", durSec: 3480, ar: "تفسير" },
  { id: "akhlaq-7", title: "Patience in Times of Trial", sub: "Ethics of the Self · Part 7", seriesId: "akhlaq", type: "audio", durSec: 2460, ar: "أخلاق" },
  { id: "l3", title: "On the Character of the Prophet ﷺ", sub: "Maulud an-Nabī 1445 · Lecture 1", seriesId: "maulud1445", type: "video", durSec: 4320, ar: "مولد" },
  { id: "l4", title: "Justice as the Balance of Society", sub: "Society & Justice · Part 3", seriesId: "society", type: "audio", durSec: 2160, ar: "عدل" },
  { id: "l5", title: "The Sermon of the Two Weighty Things", sub: "Nahj al-Balāgha · Part 9", seriesId: "nahj", type: "audio", durSec: 2820, ar: "نهج" },
  { id: "l6", title: "Gratitude and the Believing Heart", sub: "Ethics of the Self · Part 5", seriesId: "akhlaq", type: "text", durSec: 720, ar: "أخلاق" },
];

export function seriesById(id: string): SampleSeries | undefined {
  return seriesList.find((s) => s.id === id);
}

/** The cover gradient a lecture inherits from its series (falls back to green). */
export function gradientForLecture(p: Playable): Gradient {
  return seriesById(p.seriesId)?.gradient ?? ["#0B4634", "#17795E"];
}

export function lectureById(id: string): Playable | undefined {
  return lecturesList.find((l) => l.id === id);
}

/**
 * Generate a series' episodes newest-first, matching the prototype: Tafsīr uses
 * "Night N · Juz N"; other series use "<title words> — Part N". Media mix follows
 * the series' `media` (video series interleave video; text series interleave text).
 */
export function episodesForSeries(s: SampleSeries): Playable[] {
  const isTafsir = s.kind === "RAMADAN TAFSIR";
  const titleStem = s.title.split(" ").slice(0, 3).join(" ");
  return Array.from({ length: s.count }, (_, i) => {
    const idx = s.count - i;
    const type: MediaType = s.media.includes("Video")
      ? i % 3 === 0
        ? "video"
        : "audio"
      : s.media.includes("Text") && i % 4 === 0
        ? "text"
        : "audio";
    const title = isTafsir ? `Night ${idx} · Juz ${Math.min(idx, 30)}` : `${titleStem} — Part ${idx}`;
    const durSec = type === "text" ? 600 : (35 + (idx % 25)) * 60;
    return { id: `${s.id}-${idx}`, title, sub: `${s.title} · Part ${idx}`, seriesId: s.id, type, durSec, ar: s.ar };
  });
}

/** "m:ss" for a scrubber, matching the prototype's fmt(). */
export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Human duration label for an episode row. */
export function durationLabel(p: Playable): string {
  const min = Math.round(p.durSec / 60);
  return p.type === "text" ? `${min} min read` : `${min} min`;
}
