import { describe, expect, it } from "vitest";
import {
  LANGUAGES,
  LECTURE_SCOPES,
  MEDIA_TYPES,
  PUBLISH_STATUSES,
  SERIES_KINDS,
  TRANSCRIPT_STATUSES,
  USER_ROLES,
  type Album,
  type Lecture,
  type Program,
  type Series,
} from "./index";

describe("enumerable unions", () => {
  it("declares the media types text lectures branch on", () => {
    expect(MEDIA_TYPES).toEqual(["audio", "video", "text"]);
  });

  it("declares EN + HA as the only UI languages", () => {
    expect(LANGUAGES).toEqual(["en", "ha"]);
  });

  it("declares the lecture scope discriminator", () => {
    expect(LECTURE_SCOPES).toEqual(["series", "single"]);
  });

  it("declares the admin publish lifecycle", () => {
    expect(PUBLISH_STATUSES).toEqual(["published", "draft", "scheduled"]);
  });

  it("declares how series are surfaced", () => {
    expect(SERIES_KINDS).toEqual(["recency", "occasion", "topic", "book"]);
  });

  it("declares transcript coverage states", () => {
    expect(TRANSCRIPT_STATUSES).toEqual(["complete", "auto-needs-review", "missing"]);
  });

  it("declares admin roles", () => {
    expect(USER_ROLES).toEqual(["owner", "editor", "viewer"]);
  });
});

describe("content model shape", () => {
  it("models Program → per-year Series → Episode", () => {
    const program: Program = {
      id: "prog-tafsir",
      title: { en: "Ramadan Tafsīr", ha: "Tafsirin Ramadan" },
      arabic: "تفسير",
      seriesIds: ["ser-tafsir-1445"],
    };

    const series: Series = {
      id: "ser-tafsir-1445",
      programId: program.id,
      title: { en: "Ramadan Tafsīr 1445" },
      kind: "occasion",
      year: "1445 AH · 2024",
      language: "ha",
      cover: { gradient: ["#7A5A12", "#C0932F"], arabic: "١٤٤٥" },
      lectureIds: ["lec-tafsir-1445-n1"],
      featured: true,
    };

    const episode: Lecture = {
      id: "lec-tafsir-1445-n1",
      title: { en: "Night 1 · Juz 1", ha: "Dare 1 · Juz'i 1" },
      type: "audio",
      scope: "series",
      language: "ha",
      duration: 2460,
      date: "2024-03-11",
      year: "1445 AH · 2024",
      programId: program.id,
      seriesId: series.id,
      episode: 1,
      status: "scheduled",
      scheduledFor: "2024-03-11T19:30:00Z",
    };

    expect(episode.seriesId).toBe(series.id);
    expect(series.programId).toBe(program.id);
    expect(program.seriesIds).toContain(series.id);
  });

  it("models a standalone single lecture without an episode number", () => {
    const single: Lecture = {
      id: "lec-single-1",
      title: { en: "On Sincerity" },
      type: "text",
      scope: "single",
      language: "ha",
      date: "2023-09-01",
      body: { en: "In the name of God…", ha: "Da sunan Allah…" },
      status: "published",
    };

    expect(single.episode).toBeUndefined();
    expect(single.scope).toBe("single");
  });

  it("models a gallery album", () => {
    const album: Album = {
      id: "alb-maulud-1445",
      title: "Maulud 1445",
      date: "2023-09-27",
      event: "Maulud an-Nabī",
      photos: [{ id: "ph-1", url: "https://cdn/1.jpg", width: 1600, height: 1200 }],
      published: true,
    };

    expect(album.photos).toHaveLength(1);
  });
});
