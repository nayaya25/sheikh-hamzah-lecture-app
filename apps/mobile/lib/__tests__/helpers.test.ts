import { formatTime, formatBytes } from "@/lib/catalog";

describe("formatTime", () => {
  it("formats whole minutes and seconds as m:ss", () => {
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(600)).toBe("10:00");
  });

  it("pads single-digit seconds with a leading zero", () => {
    expect(formatTime(61)).toBe("1:01");
    expect(formatTime(5)).toBe("0:05");
  });

  it("floors fractional seconds", () => {
    expect(formatTime(65.9)).toBe("1:05");
  });

  it("guards negative input by clamping to 0", () => {
    expect(formatTime(-10)).toBe("0:00");
  });
});

describe("formatBytes", () => {
  it("returns '0 MB' for zero or negative byte counts", () => {
    expect(formatBytes(0)).toBe("0 MB");
    expect(formatBytes(-100)).toBe("0 MB");
  });

  it("formats sub-10 MB values with one decimal place", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("formats 10 MB and above as a rounded whole number of MB", () => {
    expect(formatBytes(42 * 1024 * 1024)).toBe("42 MB");
  });

  it("switches to GB at 1024 MB and above", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
    expect(formatBytes(15 * 1024 * 1024 * 1024)).toBe("15 GB");
  });
});
