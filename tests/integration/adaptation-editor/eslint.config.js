const base = require('../../../eslint.config.js');
const tseslint = require('typescript-eslint');
const tsParser = tseslint.parser;

module.exports = [
    {
        ignores: ['test/fixtures', 'dist', 'version.js', '**/playwright-report/**']
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                tsconfigRootDir: __dirname,
                project: 'tsconfig.eslint.json'
            }
        },
        rules: {
            'no-console': 'off'
        }
    }
];
