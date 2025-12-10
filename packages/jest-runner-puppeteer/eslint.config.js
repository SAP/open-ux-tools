const base = require('../../eslint.config.js');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json'
            }
        },
        rules: {
            'jsdoc/require-returns': 'off',
            'jsdoc/require-param': 'off',
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/match-description': 'off',
            'jsdoc/multiline-blocks': 'off',
            'jsdoc/tag-lines': 'off',
            'jsdoc/require-param-description': 'off',
            'jsdoc/no-multi-asterisks': 'off',
            'jsdoc/check-tag-names': 'off'
        }
    }
];
