import { movePlaylistItem } from "@/lib/playlists";

describe("movePlaylistItem", () => {
  it("moves an item earlier in the list", () => {
    expect(movePlaylistItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("moves an item later in the list", () => {
    expect(movePlaylistItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("is a no-op for equal or out-of-range indices", () => {
    expect(movePlaylistItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
    expect(movePlaylistItem(["a", "b"], -1, 0)).toEqual(["a", "b"]);
    expect(movePlaylistItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });

  it("does not mutate the input array", () => {
    const input = ["a", "b", "c"];
    const copy = [...input];
    movePlaylistItem(input, 0, 2);
    expect(input).toEqual(copy);
  });
});
