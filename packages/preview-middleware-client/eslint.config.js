const { defineConfig } = require('eslint/config');
const js = require('@eslint/js');

const jsdoc = require('eslint-plugin-jsdoc');
const config  = require('@sap-ux/eslint-plugin-fiori-tools');

module.exports = defineConfig([
    {
        ignores: ['dist', 'test/fixtures/**', 'coverage', 'node_modules/**', 'eslint.config.js']
    },
    ...config.defaultTS,
    {
        languageOptions: {
            ecmaVersion: 5,
            sourceType: 'script',

            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: './'
            }
        },
        plugins: {
            jsdoc
        },
        rules: {
            quotes: [
                'error',
                'single',
                {
                    allowTemplateLiterals: true
                }
            ],

            // Replace valid-jsdoc with eslint-plugin-jsdoc rules
            'jsdoc/check-alignment': 'error',
            'jsdoc/check-param-names': 'error',
            'jsdoc/check-tag-names': 'error',
            'jsdoc/check-types': 'error',
            'jsdoc/implements-on-classes': 'error',
            // "jsdoc/newline-after-description": 'error',
            'jsdoc/no-types': 'error',
            'jsdoc/require-description': 'error',
            'jsdoc/require-param': 'error',
            'jsdoc/require-param-description': 'error',
            'jsdoc/require-param-name': 'error',
            'jsdoc/require-param-type': 'off',
            'jsdoc/require-returns': 'off',
            'jsdoc/require-returns-check': 'error',
            'jsdoc/require-returns-description': 'error',
            'jsdoc/require-returns-type': 'off',

            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    varsIgnorePattern: '^_',
                    argsIgnorePattern: '^_'
                }
            ],

            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/no-unsafe-member-access': 'warn',
            '@typescript-eslint/no-unsafe-assignment': 'warn'
        }
    },
    {
        files: ['types/*.*'],
        rules: {
            '@typescript-eslint/no-namespace': 'off',
            'jsdoc/require-jsdoc': 'off'
        }
    }
]);
