const { defineConfig } = require('eslint/config');
const js = require('@eslint/js');

const jsdoc = require('eslint-plugin-jsdoc');
// const config = require('@sap-ux/eslint-plugin-fiori-tools');

module.exports = defineConfig([
    {
        ignores: ['dist', 'test/fixtures/**', 'coverage', 'node_modules/**', 'eslint.config.js']
    },
    // ...config.defaultTS,
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
            'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
            'valid-jsdoc': [
                'error',
                {
                    requireParamType: false,
                    requireReturn: false,
                    requireReturnType: false
                }
            ],
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
