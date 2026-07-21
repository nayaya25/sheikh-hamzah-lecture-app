// Wires the official AsyncStorage jest mock (per the library's own docs) so
// that modules importing it (lib/storage.ts, transitively lib/bookmarks.tsx)
// don't hit the "NativeModule: AsyncStorage is null" error under Jest.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
