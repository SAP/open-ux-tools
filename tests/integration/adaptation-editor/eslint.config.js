const base = require('../../../eslint.config.js');
module.exports = [
    ...base,
    {
        ignores: ['test/fixtures', 'dist', "version.js"],
        languageOptions: {
            parserOptions: {
                parser: '@typescript-eslint/parser',
                tsconfigRootDir: __dirname,
                project: 'tsconfig.eslint.json',
            },
        },
        rules: {
            'no-console': 'off'
        }
    },
];
