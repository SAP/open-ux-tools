const base = require('../../eslint.config.js');

module.exports = [
    ...base,
    {
        ignores: ['preview-middleware-client/**']
    },
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.eslint.json',
            },
        },
    },
];