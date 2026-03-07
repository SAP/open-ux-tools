const base = require('../../../eslint.config.js');

module.exports = [
    {
        ignores: ['test/fixtures', 'dist', 'version.js', '**/playwright-report/**']
    },
    ...base,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: 'tsconfig.eslint.json'
            }
        },
        rules: {
            'no-console': 'off'
        }
    }
];
