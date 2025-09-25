// Gesture Handler MUST be the very first import
import 'react-native-gesture-handler';
// Reanimated must be imported near the top of the entry file
import 'react-native-reanimated';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import * as SystemUI from 'expo-system-ui';

SystemUI.setBackgroundColorAsync('transparent').catch(() => {});
if (__DEV__) {
  configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: true });
  if (!(console.warn as any).__reanimatedStackPatched) {
    const originalWarn = console.warn.bind(console);
    const patchedWarn: typeof console.warn = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('[Reanimated] Writing to `value`')) {
        const stack = new Error().stack;
        originalWarn(...args, '\nStacktrace:', stack);
      } else {
        originalWarn(...args);
      }
    };
    (patchedWarn as any).__reanimatedStackPatched = true;
    console.warn = patchedWarn;
  }
}

// Initialize EAS Insights (sends basic app lifecycle/usage to EAS)
try {
  // Dynamically require so web/unsupported envs don't break
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Insights = require('expo-insights');
  if (Insights?.Insights?.initialize) {
    Insights.Insights.initialize({});
  } else if (typeof Insights?.initialize === 'function') {
    Insights.initialize({});
  }
} catch {}
import 'expo-router/entry';

