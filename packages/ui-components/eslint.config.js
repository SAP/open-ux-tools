const base = require('../../eslint.config.js');
const reactPlugin = require('eslint-plugin-react');
const globals = require('globals');
// const storybook = require('eslint-plugin-storybook');


module.exports = [
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
