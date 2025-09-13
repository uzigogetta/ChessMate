module.exports = {
	root: true,
	extends: ['@react-native/eslint-config'],
	plugins: ['react-hooks'],
	rules: {
		'react-hooks/rules-of-hooks': 'error',
		'react-hooks/exhaustive-deps': 'warn'
	}
};


