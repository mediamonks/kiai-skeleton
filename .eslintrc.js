module.exports = {
	root: true,
	parserOptions: {
		sourceType: 'module',
	},
	env: {
		browser: true,
	},
	extends: ['airbnb-base', 'prettier'],
	plugins: ['import', 'prettier'],
	settings: {
		'import/resolver': {
			node: true,
			typescript: true,
		},
	},
	rules: {
		// allow dev-dep imports in files in sync-folder
		"import/no-extraneous-dependencies": ["error", { "devDependencies": ["./tools/sync/**/*.js"] }],
		'import/extensions': [
			'error',
			'always',
			// hide known extensions that are resolved by webpack
			{
				js: 'never',
				ts: 'never',
			},
		],
		'global-require': 'off',
		// prettier compatibility
		'max-len': 0,
		'prettier/prettier': [
			'error',
			{
				singleQuote: true,
				trailingComma: 'all',
				printWidth: 100,
				tabWidth: 2,
				useTabs: false,
			},
		],
		// only for use with getter-setters
		'no-underscore-dangle': 0,
		'no-param-reassign': 0,
		'no-plusplus': 0,
		// to correctly work on windows with some tools that create windows line-endings
		// this will be correct by git when committed
		'linebreak-style': 0,
	},
};
