const base = require('../../eslint.config.js');

module.exports = [
    {
        ignores: ['dist/**', 'data/**', 'coverage/**', 'index.js'],
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            },
        },
    },
];