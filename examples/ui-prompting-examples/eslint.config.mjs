import baseConfig from '../../eslint.config.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import react from 'eslint-plugin-react';
import storybook from 'eslint-plugin-storybook';

export default [
    {
        ignores: ['dist', 'stories']
    },
    ...baseConfig,
    ...storybook.configs['flat/recommended'],
    {
        files: ['**/*.ts', '**/*.tsx'],
        ...react.configs.flat.recommended,
        settings: {
            'react': {
                'version': 'detect'
            }
        }
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url))
            }
        },
        rules: {
            'react/no-unknown-property': ['error', { 'ignore': ['onFocusCapture'] }],
            'jsdoc/require-param-description': 'off',
            'jsdoc/require-returns-description': 'off',
            'jsdoc/no-undefined-types': 'off'
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
                {
                    'varsIgnorePattern': '^_',
                    'argsIgnorePattern': '^_',
                    'ignoreRestSiblings': true,
                    caughtErrors: 'none'
                }
            ]
        }
    }
];
