const { defineConfig } = require('eslint/config');
const js = require('@eslint/js');

const jsdoc = require('eslint-plugin-jsdoc');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const fioriTools  = require('@sap-ux/eslint-plugin-fiori-tools');

module.exports = defineConfig([
    {
        ignores: [
            'test/fixtures/**',
            'dist/**',
            'node_modules/**',
            'eslint.config.js',
            'coverage/**'
        ]
    },
    ...fioriTools.config.defaultTS,
    {
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 5,
            sourceType: 'script',

            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: __dirname
            }
        },
        plugins: {
            '@typescript-eslint': typescriptEslint,
            jsdoc,
            'fiori-custom': fioriTools // backward compatibility
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
            'jsdoc/check-alignment': 'warn',
            'jsdoc/check-param-names': 'warn',
            'jsdoc/check-tag-names': 'warn',
            'jsdoc/check-types': 'warn',
            'jsdoc/implements-on-classes': 'warn',
            // "jsdoc/newline-after-description": 'error',
            'jsdoc/no-types': 'warn',
            'jsdoc/require-description': 'warn',
            'jsdoc/require-param': 'warn',
            'jsdoc/require-param-description': 'warn',
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
            '@typescript-eslint/no-unsafe-assignment': 'warn',
            // eslint 9 upgrade
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-empty-object-type': 'warn',
            '@typescript-eslint/no-unsafe-call': 'warn',
            '@typescript-eslint/no-unsafe-return': 'warn',
            '@typescript-eslint/no-floating-promises': 'warn',
            '@typescript-eslint/no-require-imports': 'warn'
        }
    },
    {
        files: ['types/*.*'],

        rules: {
            '@typescript-eslint/no-namespace': 'off',
            'jsdoc/require-jsdoc': 'off',
            '@typescript-eslint/no-redundant-type-constituents': 'warn'
        }
    },
    {
        files: ['test/**'],
        rules: {
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/await-thenable': 'off',
            '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
            '@typescript-eslint/unbound-method': 'warn',
            '@typescript-eslint/only-throw-error': 'warn',
            '@typescript-eslint/no-misused-promises': 'warn',
            '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
            'jsdoc/require-jsdoc': 'off'
        }
    }
]);