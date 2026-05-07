import base from '../../eslint.config.mjs';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';
const tsParser = tseslint.parser;
const __dirname = import.meta.dirname;

export default [
    { ignores: ['stories', 'storybook', 'test'] },
    ...base,
    reactPlugin.configs.flat.recommended,
    //   ...storybook.configs['flat/recommended'],
    {
        ignores: ['stories', './test/**/*.tsx'],
        plugins: {
            reactPlugin
        },
        languageOptions: {
            parserOptions: {
                project: './tsconfig.eslint.json',
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
            'jsdoc/no-undefined-types': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { 'varsIgnorePattern': '^_', 'argsIgnorePattern': '^_', 'ignoreRestSiblings': true }
            ]
        },
        settings: {
            'react': {
                'version': 'detect'
            }
        }
    },
    {
        languageOptions: {
            'parser': '@typescript-eslint/parser',
            project: './tsconfig.eslint.json',
            tsconfigRootDir: __dirname
        },
        files: ['./test/**/*.tsx'],
        rules: {
            'no-loop-func': 'off'
        }
    }
];
