import { describe, expect, it } from "vitest";
import type { CollectionRow, LectureRow } from "./database.types";
import { mapCollection, mapLecture } from "./mappers";

const baseLectureRow: LectureRow = {
  id: "lec-1",
  collection_id: "col-1",
  title_en: "Night 1 · Juz 1",
  title_ha: "Dare 1 · Juz'i 1",
  type: "audio",
  language: "ha",
  group_label: "1445 AH",
  sort: 1,
  media_url: "https://cdn/1.mp3",
  body_en: null,
  body_ha: null,
  duration: 2460,
  date: "2024-03-11",
  year: "1445 AH · 2024",
  status: "published",
  scheduled_for: null,
  featured: false,
};

describe("mapLecture", () => {
  it("folds title_en/title_ha into a LocalizedText", () => {
    expect(mapLecture(baseLectureRow).title).toEqual({
      en: "Night 1 · Juz 1",
      ha: "Dare 1 · Juz'i 1",
    });
  });

  it("omits the ha key when the Hausa column is null", () => {
    const l = mapLecture({ ...baseLectureRow, title_ha: null });
    expect(l.title).toEqual({ en: "Night 1 · Juz 1" });
    expect("ha" in l.title).toBe(false);
  });

  it("drops null/absent optionals rather than emitting undefined keys", () => {
    const l = mapLecture(baseLectureRow);
    expect("description" in l).toBe(false);
    expect("scheduledFor" in l).toBe(false);
    expect("body" in l).toBe(false);
    // featured: false should be omitted, not carried as false
    expect("featured" in l).toBe(false);
  });

  it("keeps duration, sort, and groupLabel when present", () => {
    const l = mapLecture(baseLectureRow);
    expect(l.duration).toBe(2460);
    expect(l.sort).toBe(1);
    expect(l.groupLabel).toBe("1445 AH");
  });

  it("maps collection_id to collectionId", () => {
    expect(mapLecture(baseLectureRow).collectionId).toBe("col-1");
  });
});

describe("mapCollection", () => {
  const collectionRow: CollectionRow = {
    id: "col-1",
    title_en: "Ramadan Tafsīr 1445",
    title_ha: null,
    kind: "occasion",
    language: "ha",
    cover_from: "#7A5A12",
    cover_to: "#C0932F",
    cover_arabic: "١٤٤٥",
    description_en: null,
    description_ha: null,
    featured: true,
    position: 0,
  };

  it("assembles the cover gradient tuple", () => {
    expect(mapCollection(collectionRow).cover.gradient).toEqual(["#7A5A12", "#C0932F"]);
  });

  it("keeps featured:true and cover.arabic", () => {
    const c = mapCollection(collectionRow);
    expect(c.featured).toBe(true);
    expect(c.cover.arabic).toBe("١٤٤٥");
  });

  it("omits featured when false and keeps position:0", () => {
    const c = mapCollection({ ...collectionRow, featured: false });
    expect("featured" in c).toBe(false);
    expect(c.position).toBe(0);
  });
});
