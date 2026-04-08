const base = require('../../eslint.config.js');
const { tsParser } = require('typescript-eslint');

module.exports = [
    ...base,
    {
        ignores: ['preview-middleware-client/**']
    },
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