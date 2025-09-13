import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins';

const withPredictiveBack: ConfigPlugin = (config) => {
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
};

export default withPredictiveBack;


