import { toggleId } from "@/lib/bookmarks";

describe("toggleId", () => {
  it("adds the id when absent", () => {
    expect(toggleId([], "a")).toEqual(["a"]);
    expect(toggleId(["x"], "a")).toEqual(["x", "a"]);
  });

  it("removes the id when present", () => {
    expect(toggleId(["a"], "a")).toEqual([]);
    expect(toggleId(["x", "a", "y"], "a")).toEqual(["x", "y"]);
  });

  it("never leaves a duplicate: toggling twice returns to the original", () => {
    const start = ["x", "y"];
    const added = toggleId(start, "a");
    expect(added).toEqual(["x", "y", "a"]);
    const removed = toggleId(added, "a");
    expect(removed).toEqual(start);
  });

  it("does not mutate the input array", () => {
    const input = ["a", "b"];
    const copy = [...input];
    toggleId(input, "a");
    toggleId(input, "c");
    expect(input).toEqual(copy);
  });
});
