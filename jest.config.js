module.exports = {
	preset: 'jest-expo',
	testEnvironment: 'jsdom',
	setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
	transformIgnorePatterns: [
		'node_modules/(?!(react-native|@react-native|expo(nent)?|@expo|expo-router|@expo/vector-icons|react-native-reanimated|@shopify/react-native-skia)/)'
	]
};


