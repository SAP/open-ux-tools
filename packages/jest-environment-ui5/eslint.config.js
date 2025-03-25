const base = require('../../eslint.config.js');
module.exports = [
    ...base,
    {
        languageOptions: {
            parserOptions: {
                parser: '@typescript-eslint/parser',
                tsconfigRootDir: __dirname,
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true
                }
            },
            globals: {
                sap: 'readonly',
                jestUI5: 'readonly',
                es2024: true,
                jest: true,
                browser: true
            },
        },
        ignores: ['src/env/ui5loader.js']
    }
];
