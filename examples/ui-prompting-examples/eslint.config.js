const base = require('../../eslint.config.js');
const reactPlugin = require('eslint-plugin-react');
const globals = require('globals');
const storybookPlugin = require('eslint-plugin-storybook');
const tsParser = require('@typescript-eslint/parser');
const { parser } = require('typescript-eslint');

module.exports = [
    ...base,
    reactPlugin.configs.flat.recommended,
    ...storybookPlugin.configs['flat/recommended'],
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
        languageOptions: {
            'parser': tsParser
        },
        files: ['./test/**/*.tsx'],
        rules: {
            'no-loop-func': 'off'
        }
    },
    {
        languageOptions: {
            parser: tsParser
        },
        files: ['./src/**/*.tsx'],
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                { 'varsIgnorePattern': '^_', 'argsIgnorePattern': '^_', 'ignoreRestSiblings': true }
            ]
        }
    }
];
