import { describe, expect, it } from "vitest";
import {
  COLLECTION_KINDS,
  LANGUAGES,
  MEDIA_TYPES,
  PUBLISH_STATUSES,
  TRANSCRIPT_STATUSES,
  USER_ROLES,
  type Album,
  type Collection,
  type Lecture,
} from "./index";

describe("enumerable unions", () => {
  it("declares the media types text lectures branch on", () => {
    expect(MEDIA_TYPES).toEqual(["audio", "video", "text"]);
  });

  it("declares EN + HA as the only UI languages", () => {
    expect(LANGUAGES).toEqual(["en", "ha"]);
  });

  it("declares the admin publish lifecycle", () => {
    expect(PUBLISH_STATUSES).toEqual(["published", "draft", "scheduled"]);
  });

  it("declares the three collection layout kinds", () => {
    expect(COLLECTION_KINDS).toEqual(["occasion", "series", "topic"]);
    expect(COLLECTION_KINDS).toHaveLength(3);
  });

  it("declares transcript coverage states", () => {
    expect(TRANSCRIPT_STATUSES).toEqual(["complete", "auto-needs-review", "missing"]);
  });

  it("declares admin roles", () => {
    expect(USER_ROLES).toEqual(["owner", "editor", "viewer"]);
  });
});

describe("content model shape", () => {
  it("models a Collection → Lecture two-level hierarchy", () => {
    const collection: Collection = {
      id: "col-tafsir-1445",
      title: { en: "Ramadan Tafsīr 1445", ha: "Tafsirin Ramadan 1445" },
      kind: "occasion",
      language: "ha",
      cover: { gradient: ["#7A5A12", "#C0932F"], arabic: "١٤٤٥" },
      featured: true,
      position: 1,
    };

    const lecture: Lecture = {
      id: "lec-tafsir-1445-n1",
      collectionId: collection.id,
      title: { en: "Night 1 · Juz 1", ha: "Dare 1 · Juz'i 1" },
      type: "audio",
      language: "ha",
      groupLabel: "1445 AH",
      sort: 1,
      duration: 2460,
      date: "2024-03-11",
      year: "1445 AH · 2024",
      status: "scheduled",
      scheduledFor: "2024-03-11T19:30:00Z",
    };

    expect(lecture.collectionId).toBe(collection.id);
    expect(collection.kind).toBe("occasion");
    expect(COLLECTION_KINDS).toContain(collection.kind);
  });

  it("models a flat series-kind collection lecture with sort order and no groupLabel", () => {
    const lecture: Lecture = {
      id: "lec-single-1",
      collectionId: "col-sincerity",
      title: { en: "On Sincerity" },
      type: "text",
      language: "ha",
      sort: 1,
      date: "2023-09-01",
      body: { en: "In the name of God…", ha: "Da sunan Allah…" },
      status: "published",
    };

    expect(lecture.groupLabel).toBeUndefined();
    expect(lecture.sort).toBe(1);
    expect(lecture.status).toBe("published");
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
