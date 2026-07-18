import { describe, expect, it } from "vitest";
import { arabic, getMessages, languageNames, messages } from "./index";

/** Recursively collect the dotted key paths of a nested string catalog. */
function keyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null
      ? keyPaths(v as Record<string, unknown>, path)
      : [path];
  });
}

describe("catalog parity", () => {
  it("HA has exactly the same keys as EN", () => {
    expect(keyPaths(messages.ha).sort()).toEqual(keyPaths(messages.en).sort());
  });

  it("has no empty strings in either catalog", () => {
    for (const lang of ["en", "ha"] as const) {
      const flat = keyPaths(messages[lang]);
      for (const path of flat) {
        const value = path
          .split(".")
          .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], messages[lang]);
        expect(value, `${lang}.${path}`).not.toBe("");
      }
    }
  });
});

describe("getMessages", () => {
  it("flips UI copy between languages", () => {
    expect(getMessages("en").nav.home).toBe("Home");
    expect(getMessages("ha").nav.home).toBe("Gida");
    expect(getMessages("ha").common.done).toBe("An gama");
  });
});

describe("arabic constants", () => {
  it("keeps decorative Arabic out of the flipping catalogs", () => {
    expect(arabic.greeting).toBe("السلام عليكم");
    expect(arabic.library).toBe("المكتبة");
  });

  it("exposes native language names for the switch rows", () => {
    expect(languageNames.en).toBe("English");
    expect(languageNames.ha).toBe("Hausa");
  });
});
