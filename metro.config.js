const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Expo Router: enable require.context in Metro
config.transformer = config.transformer || {};
config.transformer.unstable_allowRequireContext = true;

module.exports = config;
