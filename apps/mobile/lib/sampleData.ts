// Sample home data mirroring design/Althaqalayn Lectures.dc.html. Stand-in until
// the screens are wired to @althaqalayn/api; shapes are home-view-models (they
// carry display strings like relative dates), not the domain types.

import type { MediaType } from "@althaqalayn/types";

export type Gradient = readonly [from: string, to: string];

export interface HomeCategory {
  ar: string;
  label: string;
  meta: string;
  /** Series this tile opens (see @/lib/catalog). */
  seriesId: string;
}

export interface HomeSeries {
  id: string;
  kind: string;
  title: string;
  ar: string;
  metaShort: string;
  gradient: Gradient;
}

export interface HomeLecture {
  id: string;
  title: string;
  sub: string;
  type: MediaType;
  date: string;
  ar: string;
  gradient: Gradient;
}

export interface HomeAlbum {
  id: string;
  title: string;
  date: string;
  count: number;
  ar: string;
  gradient: Gradient;
}

export interface ContinueItem {
  title: string;
  /** 0–1 fraction played. */
  progress: number;
  left: string;
  gradient: Gradient;
}

export const continueItem: ContinueItem = {
  title: "Patience in Times of Trial",
  progress: 0.34,
  left: "27 min left",
  gradient: ["#4a2f5e", "#7a4f9c"],
};

export const categories: HomeCategory[] = [
  { ar: "تفسير", label: "Ramadan Tafsir", meta: "2 series · 60", seriesId: "tafsir1445" },
  { ar: "مولد", label: "Maulud", meta: "Yearly", seriesId: "maulud1445" },
  { ar: "أخلاق", label: "Morality", meta: "12 lectures", seriesId: "akhlaq" },
  { ar: "عدل", label: "Society", meta: "8 lectures", seriesId: "society" },
  { ar: "كتب", label: "Books", meta: "Nahj & more", seriesId: "nahj" },
  { ar: "نصوص", label: "Text", meta: "Read", seriesId: "akhlaq" },
];

export const featuredSeries: HomeSeries[] = [
  { id: "tafsir1445", kind: "RAMADAN TAFSIR", title: "Ramadan Tafsīr 1445", ar: "تفسير", metaShort: "30 parts · Hausa", gradient: ["#0B4634", "#17795E"] },
  { id: "tafsir1444", kind: "RAMADAN TAFSIR", title: "Ramadan Tafsīr 1444", ar: "تفسير", metaShort: "30 parts · Hausa", gradient: ["#12503f", "#1f7a5e"] },
  { id: "maulud1445", kind: "MAULUD", title: "Maulud an-Nabī ﷺ 1445", ar: "مولد", metaShort: "3 parts · Hausa & English", gradient: ["#7a5a12", "#c0932f"] },
  { id: "nahj", kind: "BOOK SERIES", title: "Commentary on Nahj al-Balāgha", ar: "نهج", metaShort: "24 parts · Hausa", gradient: ["#173a4f", "#2c7396"] },
];

export const latestLectures: HomeLecture[] = [
  { id: "l1", title: "The Meaning of Divine Mercy", sub: "Ramadan Tafsīr 1445 · Night 12", type: "video", date: "2 days ago", ar: "تفسير", gradient: ["#0B4634", "#17795E"] },
  { id: "akhlaq-7", title: "Patience in Times of Trial", sub: "Ethics of the Self · Part 7", type: "audio", date: "5 days ago", ar: "أخلاق", gradient: ["#4a2f5e", "#7a4f9c"] },
  { id: "l3", title: "On the Character of the Prophet ﷺ", sub: "Maulud an-Nabī 1445 · Lecture 1", type: "video", date: "1 week ago", ar: "مولد", gradient: ["#7a5a12", "#c0932f"] },
  { id: "l4", title: "Justice as the Balance of Society", sub: "Society & Justice · Part 3", type: "audio", date: "2 weeks ago", ar: "عدل", gradient: ["#5e3a2f", "#a06a4a"] },
  { id: "l5", title: "The Sermon of the Two Weighty Things", sub: "Nahj al-Balāgha · Part 9", type: "audio", date: "3 weeks ago", ar: "نهج", gradient: ["#173a4f", "#2c7396"] },
];

/** Recent-search suggestions on the Search empty state. */
export const recentSearches = ["Tafsir Ramadan", "Sabr", "Justice", "Maulud"];

export interface TopicChip {
  label: string;
  meta: string;
  ar: string;
  gradient: Gradient;
  seriesId: string;
}

/** "Browse topics" grid on the Search empty state. */
export const topicChips: TopicChip[] = [
  { label: "Politics & Society", meta: "Governance, justice", ar: "عدل", gradient: ["#5e3a2f", "#a06a4a"], seriesId: "society" },
  { label: "Morality & Ethics", meta: "Akhlaq of the self", ar: "أخلاق", gradient: ["#4a2f5e", "#7a4f9c"], seriesId: "akhlaq" },
  { label: "Qur’an & Tafsir", meta: "Daily exegesis", ar: "تفسير", gradient: ["#0B4634", "#17795E"], seriesId: "tafsir1445" },
  { label: "Books & Sermons", meta: "Nahj al-Balāgha", ar: "نهج", gradient: ["#173a4f", "#2c7396"], seriesId: "nahj" },
];

export interface DownloadItem {
  /** Lecture id (see @/lib/catalog). */
  id: string;
  /** Saved-file meta, e.g. "Audio · 41 min · 38 MB". */
  meta: string;
}

/** Locally-saved lectures shown on Downloads (stand-in for the offline index). */
export const downloads: DownloadItem[] = [
  { id: "akhlaq-7", meta: "Audio · 41 min · 38 MB" },
  { id: "l5", meta: "Audio · 47 min · 44 MB" },
  { id: "l1", meta: "Video · 58 min · 420 MB" },
];

export const galleryAlbums: HomeAlbum[] = [
  { id: "maulud", title: "Maulud an-Nabī ﷺ 1445", date: "October 2024", count: 32, ar: "مولد", gradient: ["#7a5a12", "#c0932f"] },
  { id: "iftar", title: "Ramadan Iftar Gathering", date: "March 2024", count: 21, ar: "إفطار", gradient: ["#0B4634", "#17795E"] },
  { id: "library", title: "Foundation Library Opening", date: "January 2024", count: 44, ar: "مكتبة", gradient: ["#173a4f", "#2c7396"] },
  { id: "ashura", title: "Annual Ashura Lecture", date: "July 2023", count: 18, ar: "عاشوراء", gradient: ["#4a2f5e", "#7a4f9c"] },
];
