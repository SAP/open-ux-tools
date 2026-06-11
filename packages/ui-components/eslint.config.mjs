import base from '../../eslint.config.mjs';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';

export default [
    { ignores: ['stories', 'storybook'] },
    ...base,
    reactPlugin.configs.flat.recommended,
    //   ...storybook.configs['flat/recommended'],
    {
        ignores: ['stories'],
        plugins: {
            reactPlugin
        },
        languageOptions: {
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
        files: ['./test/**/*.tsx'],
        rules: {
            'no-loop-func': 'off'
        }
    }
];
