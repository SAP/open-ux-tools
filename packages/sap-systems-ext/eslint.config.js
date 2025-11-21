const { ignores } = require('eslint-plugin-prettier/recommended');
const base = require('../../eslint.config.js');
module.exports = [
    {
        ignores: ['dist', 'prebuilds'],
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