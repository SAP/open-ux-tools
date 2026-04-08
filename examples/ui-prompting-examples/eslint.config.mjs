import base from '../../eslint.config.mjs';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const tsParser = tseslint.parser;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
    {
        languageOptions: {
            'parser': tsParser
        }
    },
    ...base,
    reactPlugin.configs.flat.recommended,
    {
        plugins: {
            reactPlugin
        },
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                project: 'tsconfig.eslint.json',
                tsconfigRootDir: __dirname
            },
            globals: {
                ...globals.browser
            }
        },
        rules: {
            'react/no-unknown-property': ['error', { 'ignore': ['onFocusCapture'] }],
            'jsdoc/require-param-description': 'off',
            'jsdoc/require-returns-description': 'off',
            'jsdoc/no-undefined-types': 'off'
        },
        settings: {
            'react': {
                'version': 'detect'
            }
        }
    },
    {
        files: ['./test/**/*.tsx'],
        rules: {
            'no-loop-func': 'off'
        }
    },
    {
        files: ['./src/**/*.tsx'],
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                { 'varsIgnorePattern': '^_', 'argsIgnorePattern': '^_', 'ignoreRestSiblings': true }
            ]
        }
    }
];
