import baseConfig from '../../eslint.config.mjs';
import tseslint from 'typescript-eslint';

const base = baseConfig.filter(
    (config) =>
        ![
            'typescript-eslint/base',
            'typescript-eslint-1',
            'typescript-eslint-2',
            'typescript-eslint/recommended'
        ].includes(config.name)
);

const tsParser = tseslint.parser;

export default [
    { ignores: ['src/env/ui5loader.js', 'index.d.ts'] },
    {
        languageOptions: {
            parserOptions: {
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
            }
        }
    },
    ...base
];
