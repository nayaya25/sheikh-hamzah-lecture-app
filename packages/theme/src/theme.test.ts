import { describe, expect, it } from "vitest";
import { colors, typography, spacing, radii, adminLight, adminDark } from "./index";

describe("colors", () => {
  it("uses the exact brand greens and gold from the spec", () => {
    expect(colors.greenDeep).toBe("#0B4634");
    expect(colors.greenMid).toBe("#12634E");
    expect(colors.gold).toBe("#C79A3B");
    expect(colors.goldLight).toBe("#E4C77B");
    expect(colors.cream).toBe("#F6F1E7");
    expect(colors.ink).toBe("#17231E");
  });

  it("defines topic cover gradients as [from, to] pairs", () => {
    expect(colors.topicGradients.morality).toEqual(["#4A2F5E", "#7A4F9C"]);
    expect(colors.topicGradients.book).toEqual(["#173A4F", "#2C7396"]);
  });

  it("defines media badge bg/fg pairs", () => {
    expect(colors.mediaBadge.audio).toEqual({ bg: "#EAF3EF", fg: "#12634E" });
    expect(colors.mediaBadge.video).toEqual({ bg: "#F6ECEC", fg: "#a23e3e" });
    expect(colors.mediaBadge.text).toEqual({ bg: "#F1EEF6", fg: "#6a4f9c" });
  });
});

describe("typography", () => {
  it("names the mobile + admin font families", () => {
    expect(typography.fonts.serif).toBe("Lora");
    expect(typography.fonts.arabic).toBe("Amiri");
    expect(typography.fonts.sans).toBe("Mulish");
    expect(typography.fonts.adminHeading).toBe("Sora");
    expect(typography.fonts.adminUi).toBe("Instrument Sans");
  });

  it("exposes the size scale", () => {
    expect(typography.sizes.screenTitle).toBe(26);
    expect(typography.sizes.sectionHeader).toBe(18);
  });
});

describe("layout", () => {
  it("exposes spacing and radii scales", () => {
    expect(spacing.screen).toBe(16);
    expect(radii.card).toBe(16);
  });
});

describe("admin css-var sets", () => {
  it("defines light and dark backgrounds", () => {
    expect(adminLight["--bg"]).toBeDefined();
    expect(adminDark["--bg"]).toBeDefined();
    expect(adminLight["--bg"]).not.toBe(adminDark["--bg"]);
  });
});
