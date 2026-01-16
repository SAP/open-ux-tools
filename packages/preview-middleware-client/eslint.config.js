const jsdoc = require('eslint-plugin-jsdoc');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const fioriTools = require('@sap-ux/eslint-plugin-fiori-tools');

module.exports = [
    {
        ignores: [
            'test/fixtures/**',
            'dist/**',
            'node_modules/**',
            'eslint.config.js',
            'coverage/**'
        ]
    },
    // TODO: this is already not working, fix it separately
    ...fioriTools.configs['recommended'],
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
            'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
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
];
