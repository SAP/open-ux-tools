const tseslint = require('typescript-eslint');
const fioriTools = require('@sap-ux/eslint-plugin-fiori-tools');

module.exports = [
    {
        ignores: ['test/fixtures/**', 'dist/**', 'node_modules/**', '**/*.config.js', 'coverage/**', '**/*.d.ts']
    },
    ...fioriTools.configs['recommended'],
    {
        languageOptions: {
            globals: {
                globalThis: 'readonly'
            }
        }
    },
    // Register @typescript-eslint plugin + typed linting for test/ files (recommended only covers src/)
    {
        files: ['test/**/*.ts'],
        plugins: {
            '@typescript-eslint': tseslint.plugin
        },
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                projectService: true
            }
        }
    },
    {
        files: ['src/**/*.ts', 'test/**/*.ts'],
        rules: {
            'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
            'no-unused-vars': 'off',
            'no-redeclare': 'off',
            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/no-unsafe-member-access': 'warn',
            '@typescript-eslint/no-unsafe-assignment': 'warn',
            '@sap-ux/fiori-tools/sap-no-global-variable': 'warn'
        }
    },
    {
        files: ['src/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    varsIgnorePattern: '^_',
                    argsIgnorePattern: '^_'
                }
            ]
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
