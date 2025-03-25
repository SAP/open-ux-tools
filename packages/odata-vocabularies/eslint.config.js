const { rules } = require('eslint-plugin-promise');
const base = require('../../eslint.config.js');
module.exports = [
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: '@typescript-eslint/parser',
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            },
        },
        rules: {
            "sonarjs/no-implicit-dependencies": "warn",
        }
    },
];