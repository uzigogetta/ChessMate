// Gesture Handler MUST be the very first import
import 'react-native-gesture-handler';
// Reanimated must be imported near the top of the entry file
import 'react-native-reanimated';
import * as SystemUI from 'expo-system-ui';

SystemUI.setBackgroundColorAsync('transparent').catch(() => {});

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
