module.exports = function (api) {
	api.cache(true);
	return {
		presets: ['babel-preset-expo'],
		plugins: [
			// Required for expo-router to resolve app root at build time
			'expo-router/babel',
			// Reanimated plugin must be last
			'react-native-reanimated/plugin'
		]
	};
};


