module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated plugin must be listed last (per react-native-reanimated docs)
    plugins: [
      'react-native-reanimated/plugin'
    ],
  };
};