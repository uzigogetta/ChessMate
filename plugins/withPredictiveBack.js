const { withAndroidManifest } = require('expo/config-plugins');

/** @type {import('expo/config-plugins').ConfigPlugin} */
function withPredictiveBack(config) {
	return withAndroidManifest(config, (cfg) => {
		const manifest = cfg.modResults;
		const app = manifest.manifest.application?.[0];
		if (!app) return cfg;
		const mainActivity = app.activity?.find((a) => a?.$?.['android:name'] === '.MainActivity');
		if (mainActivity?.$) {
			mainActivity.$['android:enableOnBackInvokedCallback'] = 'true';
		}
		return cfg;
	});
}

module.exports = withPredictiveBack;


