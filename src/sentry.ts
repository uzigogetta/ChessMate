import * as Sentry from '@sentry/react-native';

Sentry.init({
	dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
	enableNative: true,
	tracesSampleRate: 0.1
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


