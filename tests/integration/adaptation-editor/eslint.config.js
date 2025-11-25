const base = require('../../../eslint.config.js');
module.exports = [
    {
        ignores: ['test/fixtures', 'dist', 'version.js', '**/playwright-report/**']
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: '@typescript-eslint/parser',
                tsconfigRootDir: __dirname,
                project: 'tsconfig.eslint.json'
            }
        },
        rules: {
            'no-console': 'off'
        }
    }
];
