import { describe, expect, it } from "vitest";
import type { LectureRow, SeriesRow } from "./database.types";
import { mapLecture, mapSeries } from "./mappers";

const baseLectureRow: LectureRow = {
  id: "lec-1",
  title_en: "Night 1 · Juz 1",
  title_ha: "Dare 1 · Juz'i 1",
  type: "audio",
  scope: "series",
  language: "ha",
  duration: 2460,
  date: "2024-03-11",
  year: "1445 AH · 2024",
  description_en: null,
  description_ha: null,
  media_url: "https://cdn/1.mp3",
  body_en: null,
  body_ha: null,
  program_id: "prog-1",
  series_id: "ser-1",
  episode: 1,
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

  it("keeps duration and episode when present", () => {
    const l = mapLecture(baseLectureRow);
    expect(l.duration).toBe(2460);
    expect(l.episode).toBe(1);
  });
});

describe("mapSeries", () => {
  const seriesRow: SeriesRow = {
    id: "ser-1",
    program_id: "prog-1",
    title_en: "Ramadan Tafsīr 1445",
    title_ha: null,
    kind: "occasion",
    year: "1445 AH · 2024",
    occasion: null,
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
    expect(mapSeries(seriesRow).cover.gradient).toEqual(["#7A5A12", "#C0932F"]);
  });

  it("uses the ordered episode ids passed in, not the row", () => {
    const s = mapSeries(seriesRow, ["lec-1", "lec-2"]);
    expect(s.lectureIds).toEqual(["lec-1", "lec-2"]);
  });

  it("keeps featured:true but keeps cover.arabic", () => {
    const s = mapSeries(seriesRow);
    expect(s.featured).toBe(true);
    expect(s.cover.arabic).toBe("١٤٤٥");
  });
});
