const { withAndroidManifest } = require('@expo/config-plugins');

/** @type {import('@expo/config-plugins').ConfigPlugin} */
function withPredictiveBack(config) {
	return withAndroidManifest(config, (config) => {
		const manifest = config.modResults;
		const application = manifest.manifest.application?.[0];
		if (!application) return config;
		const mainActivity = application.activity?.find((a) => a?.$?.['android:name'] === '.MainActivity');
		if (mainActivity) {
			mainActivity.$['android:enableOnBackInvokedCallback'] = 'true';
		}
		return config;
	});
}

module.exports = withPredictiveBack;


