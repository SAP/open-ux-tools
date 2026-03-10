const base = require('../../eslint.config.js');
const { tsParser } = require('typescript-eslint');

module.exports = [
    {
        ignores: ['dist/**', 'data/**', 'coverage/**', 'index.js', 'jest.config.mjs'],
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