const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  fs: require.resolve('./src/node-stubs/fs.js'),
  path: require.resolve('./src/node-stubs/path.js'),
  perf_hooks: require.resolve('./src/node-stubs/perf_hooks.js'),
  os: require.resolve('./src/node-stubs/os.js'),
  readline: require.resolve('./src/node-stubs/readline.js'),
  worker_threads: require.resolve('./src/node-stubs/worker_threads.js'),
};

// Expo Router: enable require.context in Metro
config.transformer = config.transformer || {};
config.transformer.unstable_allowRequireContext = true;

module.exports = config;
