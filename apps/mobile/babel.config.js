module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated 4 ships its worklets transform separately; must be listed last.
    plugins: ["react-native-worklets/plugin"],
  };
};
