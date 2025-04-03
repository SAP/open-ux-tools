const { defineConfig } = require('eslint/config');

const js = require('@eslint/js');

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([
    {
        extends: compat.extends('plugin:@sap-ux/eslint-plugin-fiori-tools/defaultTS'),

        languageOptions: {
            ecmaVersion: 5,
            sourceType: 'script',

            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: '/Users/I058153/git/SAPDevelop/open-ux-tools/packages/preview-middleware-client'
            }
        },

        rules: {
            quotes: [
                'error',
                'single',
                {
                    allowTemplateLiterals: true
                }
            ],

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
