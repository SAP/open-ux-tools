const base = require('../../eslint.config.js');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
    {
        ignores: ['dist/**', 'data/**', 'coverage/**', 'index.js'],
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