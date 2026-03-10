const base = require('../../eslint.config.js');
const { tsParser } = require('typescript-eslint');

module.exports = [
    // Ignore config files that aren't TypeScript
    {
        ignores: ['esbuild.config.mjs']
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            },
        },
    },
];