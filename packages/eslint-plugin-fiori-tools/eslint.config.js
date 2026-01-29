const base = require('../../eslint.config.js');
const { default: eslintPlugin } = require('eslint-plugin-eslint-plugin');

const tsParser = require('@typescript-eslint/parser');

module.exports = [
    {
        ignores: ['config/**/eslintrc*.js']
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json'
            }
        }
    },
    eslintPlugin.configs.recommended
];
