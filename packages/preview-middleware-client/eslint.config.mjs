import tseslint from 'typescript-eslint';
import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';

export default [
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
    // Typed linting for src/ files
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                projectService: true
            }
        }
    },
    // Parser for test/ files without type-checked linting
    {
        files: ['test/**/*.ts'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: null
            }
        }
    },
    {
        files: ['src/**/*.ts', 'test/**/*.ts'],
        rules: {
            'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
            'no-unused-vars': 'off',
            'no-redeclare': 'off',
            '@sap-ux/fiori-tools/sap-no-global-variable': 'warn'
        }
    },
    // Type-checked rules only for src/ (test files have no type info)
    {
        files: ['src/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/no-unsafe-member-access': 'warn',
            '@typescript-eslint/no-unsafe-assignment': 'warn'
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
