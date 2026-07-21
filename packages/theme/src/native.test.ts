import { describe, expect, it } from "vitest";
import { resolveTheme, typePresets } from "./native";

describe("resolveTheme", () => {
  it("returns light and dark with distinct backgrounds", () => {
    expect(resolveTheme("light").c.bg).not.toBe(resolveTheme("dark").c.bg);
  });
  it("keeps the gold accent constant across schemes", () => {
    expect(resolveTheme("light").c.accent).toBe(resolveTheme("dark").c.accent);
  });
  it("exposes every type preset with a fontFamily + positive lineHeight", () => {
    for (const p of Object.values(typePresets)) {
      expect(p.fontFamily).toBeTruthy();
      expect(p.lineHeight).toBeGreaterThan(p.fontSize);
    }
  });
});
