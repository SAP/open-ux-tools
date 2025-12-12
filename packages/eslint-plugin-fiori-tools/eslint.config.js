const { rules } = require('eslint-plugin-fiori-custom');
const base = require('../../eslint.config.js');

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
    }
];
