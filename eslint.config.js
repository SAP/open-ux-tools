const { FlatCompat } = require('@eslint/eslintrc');
const tsParser = require('@typescript-eslint/parser');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const pluginPromise = require('eslint-plugin-promise');
const pluginJsdoc = require('eslint-plugin-jsdoc');
const tseslint = require('typescript-eslint');
const importPlugin = require('eslint-plugin-import');
const sonarjs = require('eslint-plugin-sonarjs');

const compat = new FlatCompat({
    baseDirectory: __dirname, // optional; default: process.cwd()
    resolvePluginsRelativeTo: __dirname // optional
});

module.exports = [
    {
        ignores: [
            '**/eslint.config.cjs',
            // '**/*.d.ts',
            'dist',
            'coverage',
            'test/unit/coverage',
            'node_modules',
            'jest.config.js',
            'jest*.js',
            'eslint.config.js',
            'scripts',
            'test/data',
            'test/test-data',
            'test/test-input',
            'test/manual',
            'test/fixtures',
            'test/__fixtures__',
            'test/**/fixtures',
            '**/fixtures-copy/',
            'test/unit/expected-output',
            'test/unit/sample',
            'test/sample',
            'test/__mocks__',
            'templates',
            'test/test-output',
            'test/int/test-output',
            'esbuild.js',
            ' esbuild*.js',
            '__mocks__',
            'test/tools-suite-telemetry/fixtures',
            'lint-staged.config.js',
            'generators/',
            'lib',
            'eslintrc-typescript.js',
            'eslintrc-test.js',
            'eslintrc-prod.js',
            'eslintrc-common.js',
            '.storybook',
            '**/snapshotResolver.js',
            '**/expected-output/**',
        ]
    },
    eslintPluginPrettierRecommended,
    pluginPromise.configs['flat/recommended'],
    pluginJsdoc.configs['flat/recommended'],
    ...tseslint.configs.recommended,
    importPlugin.flatConfigs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        rules: {
            'comma-dangle': ['error', 'never'],
            'jsdoc/require-param': 'warn', // TODO revert to error
            'jsdoc/require-param-description': 'warn',
            'jsdoc/require-param-name': 'error',
            'jsdoc/require-param-type': 'warn',
            'jsdoc/require-returns': 'warn', // TODO revert to error
            'jsdoc/require-returns-check': 'error',
            'jsdoc/require-returns-description': 'warn',
            'jsdoc/require-returns-type': 'error',

            'jsdoc/require-jsdoc': [
                'warn',
                {
                    require: {
                        ClassDeclaration: true,
                        MethodDefinition: true
                    },

                    exemptEmptyFunctions: true,
                    contexts: ['TSMethodSignature']
                }
            ],

            'jsdoc/valid-types': 'error',
            'jsdoc/check-types': 'error',
            'jsdoc/check-param-names': 'error',

            'jsdoc/check-tag-names': [
                'warn', // TODO revert to error
                {
                    definedTags: ['ui5-restricted', 'experimental', 'final']
                }
            ],

            'jsdoc/match-description': 'warn', // TODO revert to error
            'promise/always-return': 'off',
            'promise/no-return-wrap': 'off',
            'promise/param-names': 'error',
            'promise/catch-or-return': 'error',
            'promise/no-native': 'off',
            'promise/no-nesting': 'warn',
            'promise/no-promise-in-callback': 'warn',
            'promise/no-callback-in-promise': 'warn',
            'promise/avoid-new': 'off',
            'promise/no-new-statics': 'error',
            'promise/no-return-in-finally': 'warn',
            'promise/valid-params': 'warn',
            'no-cond-assign': 'error',
            'no-console': 'warn',
            'no-constant-condition': 'error',
            'no-control-regex': 'error',
            'no-debugger': 'error',
            'no-dupe-args': 'error',
            'no-dupe-keys': 'error',
            'no-duplicate-case': 'error',
            'no-empty-character-class': 'error',
            'no-empty': 'error',
            'no-ex-assign': 'error',
            'no-extra-boolean-cast': 'warn',
            'no-extra-parens': ['error', 'functions'],
            'no-extra-semi': 'error',
            'no-func-assign': 'error',
            'no-inner-declarations': ['error', 'functions'],
            'no-invalid-regexp': 'error',
            'no-irregular-whitespace': 'error',
            'no-negated-in-lhs': 'error',
            'no-obj-calls': 'error',
            'no-regex-spaces': 'error',
            'no-sparse-arrays': 'error',
            'no-unreachable': 'error',
            'use-isnan': 'error',
            'valid-typeof': 'error',
            'accessor-pairs': 'error',
            'block-scoped-var': 'warn',
            'consistent-return': 'warn',
            curly: ['error', 'all'],
            'default-case': 'warn',
            'no-alert': 'error',
            'no-caller': 'error',
            'no-div-regex': 'error',
            'no-eval': 'error',
            'no-extend-native': 'error',
            'no-extra-bind': 'error',
            'no-fallthrough': 'error',
            'no-floating-decimal': 'error',
            'no-implied-eval': 'error',
            'no-iterator': 'error',
            'no-labels': 'error',
            'no-lone-blocks': 'error',
            'no-loop-func': 'error',
            'no-native-reassign': 'error',
            'no-new-func': 'error',
            'no-new-wrappers': 'warn',
            'no-new': 'warn',
            'no-octal-escape': 'error',
            'no-octal': 'error',
            'no-proto': 'error',
            'no-redeclare': 'warn',
            'no-return-assign': 'error',
            'no-script-url': 'error',
            'no-self-compare': 'error',
            'no-sequences': 'error',
            'no-unused-expressions': 'warn',
            'no-void': 'error',
            'no-warning-comments': 'warn',
            'no-with': 'error',
            radix: 'error',
            'wrap-iife': ['error', 'any'],
            yoda: 'error',
            strict: ['error', 'function'],
            'no-catch-shadow': 'error',
            'no-delete-var': 'error',
            'no-label-var': 'error',
            'no-shadow-restricted-names': 'error',
            'no-undef-init': 'error',
            // 'no-undef': 'error', It is safe to disable this rule when using TypeScript because TypeScript's compiler enforces this check.
            // 'no-unused-vars': ['error', { // disable and use @typescript-eslint/no-unused-vars instead
            //     vars: 'all',
            //     args: 'none',
            // }],

            'no-use-before-define': 'off',
            camelcase: 'warn',
            'consistent-this': ['warn', 'that'],
            'max-nested-callbacks': ['warn', 3],
            'new-cap': 'warn',
            'new-parens': 'error',
            'no-array-constructor': 'error',
            'no-lonely-if': 'warn',
            'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
            'no-nested-ternary': 'error',
            'no-new-object': 'error',
            'quote-props': [
                'error',
                'as-needed',
                {
                    keywords: false,
                    unnecessary: false
                }
            ],

            'semi-spacing': [
                'warn',
                {
                    before: false,
                    after: true
                }
            ],

            semi: 'error',

            'keyword-spacing': [
                'error',
                {
                    after: true
                }
            ],

            'sonarjs/cognitive-complexity': 'warn',
            'sonarjs/no-nested-template-literals': 'warn',
            'space-infix-ops': 'error',

            'space-unary-ops': [
                'error',
                {
                    words: true,
                    nonwords: false
                }
            ],

            'import/no-unresolved': 'error',

            'import/no-extraneous-dependencies': [
                'error',
                {
                    devDependencies: true,
                    optionalDependencies: true,
                    peerDependencies: true,
                    bundledDependencies: false
                }
            ],

            'prettier/prettier': [
                'error',
                {
                    endOfLine: 'auto',
                    quoteProps: 'preserve'
                }
            ]
        }
    },
    {
        name: 'typescript-eslint-1',
        languageOptions: {
            parser: tsParser
        },
        files: ['**/*.ts', '**/*.tsx'],
        // 'extends': ['plugin:@typescript-eslint/recommended'],
        rules: {
            '@typescript-eslint/ban-types': 'off',
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-wrapper-object-types': 'warn',
            '@typescript-eslint/no-unsafe-assignment': 'warn',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    'varsIgnorePattern': '^_',
                    'argsIgnorePattern': '^_',
                    'caughtErrors': 'none'
                }
            ],
            '@typescript-eslint/no-floating-promises': ['error'],
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    'prefer': 'type-imports',
                    'disallowTypeAnnotations': true
                }
            ],
            '@typescript-eslint/no-misused-promises': ['error', { 'checksVoidReturn': false }],
            '@typescript-eslint/no-use-before-define': ['error', 'nofunc'],
            '@typescript-eslint/prefer-nullish-coalescing': 'warn',
            '@typescript-eslint/prefer-optional-chain': 'warn',
            '@typescript-eslint/no-unsafe-function-type': 'warn',
            '@typescript-eslint/no-empty-object-type': 'warn',
            '@typescript-eslint/no-require-imports': [
                'error',
                {
                    'allowAsImport': true
                }
            ],
            'jsdoc/require-param-type': 'off',
            'jsdoc/require-returns-type': 'off',
            'prefer-const': [
                'error',
                {
                    'destructuring': 'all'
                }
            ],
            'jsdoc/tag-lines': [
                'error',
                'never',
                {
                    'startLines': 1
                }
            ]
        },
        'settings': {
            'jsdoc': {
                'mode': 'typescript'
            }
        }
    },
    {
        name: 'typescript-eslint-2',
        languageOptions: {
            parser: tsParser
        },
        files: ['**/test/**/*.js', '**/test/**/*.ts', '**/test/**/*.tsx'],
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            'jsdoc/require-param': 'off',
            'jsdoc/require-param-description': 'off',
            'jsdoc/require-param-name': 'off',
            'jsdoc/require-param-type': 'off',
            'jsdoc/require-returns': 'off',
            'jsdoc/require-returns-check': 'off',
            'jsdoc/require-returns-description': 'off',
            'jsdoc/require-returns-type': 'off',
            'jsdoc/require-jsdoc': [
                'off',
                {
                    'require': {
                        'ClassDeclaration': true,
                        'MethodDefinition': true
                    },
                    'exemptEmptyFunctions': true
                }
            ],
            'jsdoc/valid-types': 'off',
            'jsdoc/check-types': 'off',
            'jsdoc/check-tag-names': 'off',
            'jsdoc/match-description': 'off',
            'promise/param-names': 'off',
            'promise/catch-or-return': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    'prefer': 'type-imports',
                    'disallowTypeAnnotations': true
                }
            ],
            '@typescript-eslint/no-use-before-define': ['error', 'nofunc']
        }
    },
    {
        files: ['**/test/**/*.js', '**/test/**/*.ts', '**/test/**/*.tsx'],
        rules: {
            'no-console': 'off',
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-returns-description': 'off',
            'jsdoc/require-param-description': 'off',
            'max-nested-callbacks': ['warn', 5],
            'sonarjs/cognitive-complexity': 'off'
        }
    },
    {
        plugins: { sonarjs },
        rules: {
            'sonarjs/no-implicit-dependencies': 'error'
        }
    },
    {
        settings: {
            jsdoc: {
                tagNamePreference: {
                    augments: {
                        message:
                            '@extends is to be used over @augments as it is more evocative of classes than @augments',
                        replacement: 'extends'
                    }
                }
            },

            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: ['./packages/*/tsconfig.json', './tsconfig.json']
                }
            }
        }
    }
];
