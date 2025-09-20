// Reanimated must be imported at the top of the entry file
import 'react-native-reanimated';
// Initialize EAS Insights (sends basic app lifecycle/usage to EAS)
try {
  // Dynamically require so web/unsupported envs don’t break
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Insights = require('expo-insights');
  if (Insights?.Insights?.initialize) {
    Insights.Insights.initialize({});
  } else if (typeof Insights?.initialize === 'function') {
    Insights.initialize({});
  }
} catch {}
import 'expo-router/entry';
