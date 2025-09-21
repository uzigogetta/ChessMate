import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const sentryDsn =
  (process.env.EXPO_PUBLIC_SENTRY_DSN as string | undefined)?.trim() ||
  (Constants.expoConfig?.extra as any)?.sentryDsn;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
  });
} else if (__DEV__) {
  // eslint-disable-next-line no-console
  console.warn('[sentry] DSN not configured; telemetry disabled');
}

function Root() {
  return null;
}

export default sentryDsn ? Sentry.wrap(Root) : Root;
