const base = require('../../eslint.config.js');
module.exports = [
    {
        ignores: ['dist/**', 'data/**', 'coverage/**', 'index.js'],
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: '@typescript-eslint/parser',
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            },
        },
    },
];