const base = require('../../../eslint.config.js');
const tsParser = require('@typescript-eslint/parser');

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
