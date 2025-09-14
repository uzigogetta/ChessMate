import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

Sentry.init({
	// prefer app.json extra, fall back to env var
	dsn: (Constants.expoConfig?.extra as any)?.sentryDsn || process.env.EXPO_PUBLIC_SENTRY_DSN,
	enableNative: true,
	enableAutoSessionTracking: true,
	debug: __DEV__,
	tracesSampleRate: 0.2,
	// following keys are future-proof; cast avoids TS complaints if not in types yet
	...( { replaysSessionSampleRate: 0.1, replaysOnErrorSampleRate: 1.0 } as any ),
	environment: __DEV__ ? 'development' : (process.env.EXPO_PUBLIC_ENV ?? 'production'),
	release: Constants.expoConfig?.version || 'dev'
});

// Capture unhandled errors
const defaultHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
if ((global as any).ErrorUtils?.setGlobalHandler) {
	(global as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
		Sentry.captureException(error);
		if (typeof defaultHandler === 'function') {
			defaultHandler(error, isFatal);
		}
	});
}

// Capture unhandled promise rejections
const originalUnhandledRejection = (global as any).onunhandledrejection;
(global as any).onunhandledrejection = (event: any) => {
	try {
		const reason = event?.reason ?? event;
		Sentry.captureException(reason);
	} finally {
		if (typeof originalUnhandledRejection === 'function') {
			originalUnhandledRejection(event);
		}
	}
};

export { Sentry };


