module.exports = {
  preset: "jest-expo",
  // The AsyncStorage native module is null under Jest; wire the library's own
  // official mock (recommended by its docs) rather than duplicating storage
  // logic just to dodge the import in lib/bookmarks.tsx -> lib/storage.ts.
  setupFiles: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)",
  ],
};
