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
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            },
        },
    },
];