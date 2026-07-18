import { describe, expect, it } from "vitest";
import { escapePostgrestLike } from "./content";

describe("escapePostgrestLike", () => {
  it("leaves ordinary search text untouched", () => {
    expect(escapePostgrestLike("ramadan tafsir")).toBe("ramadan tafsir");
  });

  it("neutralizes PostgREST .or() filter metacharacters", () => {
    // A crafted query trying to break out of the ilike filter and inject another.
    const attack = "x%,status.eq.draft)";
    const escaped = escapePostgrestLike(attack);
    expect(escaped).toBe("x\\%\\,status.eq.draft\\)");
    // No unescaped comma or paren survives to split/close the filter group.
    expect(/(?<!\\)[,()]/.test(escaped)).toBe(false);
  });

  it("escapes the backslash first so escapes aren't double-consumed", () => {
    expect(escapePostgrestLike("a\\b")).toBe("a\\\\b");
  });
});
