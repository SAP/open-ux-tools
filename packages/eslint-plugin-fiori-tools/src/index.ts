import { readFileSync } from 'node:fs';
import { join, relative, posix } from 'node:path';
import type { Linter } from 'eslint';
import type { Plugin } from '@eslint/config-helpers';
import babelParser from '@babel/eslint-parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import { rules } from './rules';
import { FioriLanguage } from './language/fiori-language';
import { createSyncFn } from 'synckit';
import type { getPathMappings } from '@sap-ux/project-access';
import { uniformUrl } from '@sap-ux/fiori-annotation-api';
export { DiagnosticCache } from './language/diagnostic-cache';

// Use CommonJS require for modules with resolution issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tsParser = require('@typescript-eslint/parser') as any;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const globals = require('globals') as any;

// Read package.json to get version
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as {
    name: string;
    version: string;
};

/**
 * Plugin meta information (required for ESLint 9).
 * Contains the plugin name and version.
 */
export const meta = {
    name: packageJson.name,
    version: packageJson.version
};

/**
 * Language definitions supported by the plugin.
 * Currently includes the Fiori language for annotation and manifest files.
 */
export const languages = {
    fiori: new FioriLanguage()
};

/**
 * Default export following ESLint 9 plugin structure.
 * This is the recommended way to export plugins in ESLint 9.
 * Contains plugin metadata, supported languages, rules, and processors.
 */
const plugin: Plugin = {
    meta: {
        name: packageJson.name,
        version: '0.0.1',
        namespace: '@sap-ux/fiori-tools'
    },
    languages,
    rules: rules as Plugin['rules'],
    processors: {}
};

// Shared globals
const globalsConfig = {
    ...globals.browser,
    ...globals.node,
    ...globals.es2020,
    ...globals.amd,
    ...globals.mocha,
    // SAP-specific globals (from legacy S/4HANA eslintrc)
    com: 'readonly',
    oData: 'off',
    sakp: 'off',
    fin: 'readonly',
    cloud: 'readonly',
    bsuite: 'off',
    cordova: 'off',
    ui: 'readonly',
    webide: 'off',
    asyncTest: 'off',
    i2d: 'readonly',
    gltrade: 'off',
    drilldown: 'readonly',
    opaTest: 'off',
    ux: 'readonly',
    test: 'off',
    $: 'off',
    module: 'off',
    ai: 'off',
    notEqual: 'off',
    throws: 'off',
    ssuite: 'off',
    deepEqual: 'off',
    s2p: 'off',
    Promise: 'off',
    ehs: 'off',
    sinon: 'off',
    stop: 'off',
    util: 'readonly',
    slo: 'off',
    mdm: 'off',
    mytravelandexpense: 'off',
    strictEqual: 'off',
    cec: 'off',
    cus: 'off',
    notStrictEqual: 'off',
    fscm: 'off',
    fm: 'readonly',
    nw: 'readonly',
    shcm: 'off',
    fcg: 'readonly',
    URI: 'off',
    fs: 'readonly',
    retail: 'off',
    d3: 'off',
    hcm: 'off',
    oil: 'readonly',
    assert: 'off',
    hpa: 'off',
    ok: 'off',
    sap: 'readonly',
    QUnit: 'off',
    cross: 'readonly',
    srm: 'off',
    equal: 'off',
    expect: 'off',
    jQuery: 'off',
    publicservices: 'readonly',
    uxcc: 'off',
    equals: 'off',
    tl: 'off',
    travel: 'readonly'
} as const;
/**
 * Standard ESLint rules based on legacy "fiori_tools_configure.eslintrc" configuration
 *
 * These rules were completely removed from ESLint 9 and have no direct replacement:
 * valid-jsdoc - Originally: ['warn', { requireReturn: false }]
 * no-catch-shadow - Originally: 'warn'
 * handle-callback-err - Originally: 'off'
 * no-process-exit - Originally: 'off'
 * no-process-env - Originally: 'off'
 * no-new-require - Originally: 'off'
 * no-path-concat - Originally: 'off'
 * newline-after-var - Originally: 'off'
 *
 * These rules were replaced with a different rule in ESLint 9:
 * no-spaced-func → func-call-spacing
 * no-native-reassign → no-global-assign
 * no-negated-in-lhs → no-unsafe-negation
 */
const standardEslintRules: Linter.RulesRecord = {
    'no-unreachable': 'warn',
    'no-regex-spaces': 'error',
    'no-shadow': 'warn',
    'quotes': ['warn', 'double', 'avoid-escape'],
    'no-return-assign': 'warn',
    'max-len': ['warn', 200],
    'no-mixed-spaces-and-tabs': 'off',
    'no-param-reassign': 'warn',
    'strict': 'off',
    'eol-last': 'off',
    'no-new-func': 'error',
    'constructor-super': 'off',
    'no-eval': 'error',
    'new-parens': 'warn',
    'yoda': ['warn', 'never'],
    'no-delete-var': 'warn',
    'no-ternary': 'off',
    'no-nested-ternary': 'warn',
    'no-dupe-args': 'error',
    'complexity': ['warn', 20],
    'no-control-regex': 'error',
    'no-invalid-regexp': 'error',
    'no-iterator': 'warn',
    'no-with': 'error',
    'func-call-spacing': 'warn', // Replaces deprecated no-spaced-func
    'curly': ['warn', 'all'],
    'no-debugger': 'error',
    'no-extend-native': 'warn',
    'no-constant-condition': 'error',
    'no-redeclare': 'warn',
    'one-var': 'off',
    'radix': 'warn',
    'sort-vars': 'off',
    'no-new': 'warn',
    'no-obj-calls': 'error',
    'accessor-pairs': 'off',
    'no-bitwise': 'off',
    'wrap-iife': ['warn', 'any'],
    'no-alert': 'error',
    'no-script-url': 'warn',
    'func-style': 'off',
    'max-depth': ['warn', 4],
    'no-undefined': 'off',
    'no-unexpected-multiline': 'off',
    'no-dupe-keys': 'error',
    'no-loop-func': 'warn',
    'no-shadow-restricted-names': 'warn',
    'guard-for-in': 'warn',
    'vars-on-top': 'off',
    'no-extra-semi': 'warn',
    'no-global-assign': 'error', // Replaces deprecated no-native-reassign
    'comma-dangle': 'warn',
    'no-extra-parens': 'off',
    'no-else-return': 'off',
    'no-array-constructor': 'warn',
    'use-isnan': 'error',
    'quote-props': 'off',
    'no-multi-str': 'warn',
    'object-shorthand': 'off',
    'no-throw-literal': 'warn',
    'no-var': 'off',
    'consistent-return': 'warn',
    'no-func-assign': 'error',
    'no-self-compare': 'warn',
    'operator-assignment': 'off',
    'no-new-wrappers': 'warn',
    'padded-blocks': 'off',
    'no-unsafe-negation': 'error', // Replaces deprecated no-negated-in-lhs
    'no-implied-eval': 'error',
    'no-div-regex': 'off',
    'no-void': 'off',
    'no-extra-bind': 'warn',
    'no-unneeded-ternary': 'off',
    'no-plusplus': 'off',
    'no-ex-assign': 'error',
    'default-case': 'off',
    'no-lonely-if': 'off',
    'no-inner-declarations': ['error', 'functions'],
    'max-statements': ['warn', 40],
    'valid-typeof': 'error',
    'no-inline-comments': 'off',
    'semi': 'error',
    'no-empty-character-class': 'warn',
    'no-empty': 'warn',
    'no-proto': 'warn',
    'no-continue': 'off',
    'no-cond-assign': 'error',
    'no-octal': 'warn',
    'no-new-object': 'warn',
    'func-names': 'off',
    'no-irregular-whitespace': 'error',
    'consistent-this': ['warn', 'that'],
    'camelcase': 'warn',
    'space-infix-ops': 'warn',
    'no-fallthrough': 'warn',
    'no-warning-comments': [
        'warn',
        {
            terms: ['todo', 'fixme', 'xxx'],
            location: 'start'
        }
    ],
    'no-octal-escape': 'warn',
    'no-unused-vars': [
        'warn',
        {
            args: 'none',
            vars: 'all'
        }
    ],
    'no-sparse-arrays': 'error',
    'operator-linebreak': 'off',
    'no-sequences': 'warn',
    'no-undef': 'warn',
    'eqeqeq': 'warn',
    'indent': 'off',
    'no-multi-spaces': 'off',
    'new-cap': [
        'warn',
        {
            capIsNew: false
        }
    ],
    'no-console': 'error',
    'no-extra-boolean-cast': 'warn',
    'block-scoped-var': 'off',
    'no-labels': 'warn',
    'no-eq-null': 'warn',
    'no-label-var': 'warn',
    'no-use-before-define': 'warn',
    'semi-spacing': 'warn',
    'linebreak-style': ['error', 'unix'],
    'max-params': ['warn', 8],
    'no-caller': 'error',
    'no-lone-blocks': 'warn',
    'wrap-regex': 'off',
    'no-unused-expressions': 'error',
    'dot-notation': 'warn',
    'no-undef-init': 'warn',
    'no-duplicate-case': 'error',
    'prefer-const': 'off',
    'no-this-before-super': 'off'
};

// Use synckit to create sync function for project-access getPathMappingsSync
const workerPath = join(__dirname, 'worker-getPathMappingsSync.js');
const getPathMappingsSync = createSyncFn<typeof getPathMappings>(workerPath);

const pathMappingsAbsolute = getPathMappingsSync(process.cwd());
const webappPathAbsolute =
    'webapp' in pathMappingsAbsolute
        ? pathMappingsAbsolute.webapp
        : (pathMappingsAbsolute.src ?? join(process.cwd(), 'webapp'));
const webappPathRelative = uniformUrl(relative(process.cwd(), webappPathAbsolute));
const testPathRelative =
    'webapp' in pathMappingsAbsolute
        ? posix.join(webappPathRelative, 'test')
        : uniformUrl(relative(process.cwd(), pathMappingsAbsolute.test ?? join(process.cwd(), 'webapp/test')));

const localServiceUpperCase = posix.join(webappPathRelative, 'localService');
const localServiceLowerCase = posix.join(webappPathRelative, 'localservice');

// Base Fiori Tools rules (common across both configs)
const baseFioriToolsRules = {
    // Error rules (alphabetical)
    '@sap-ux/fiori-tools/sap-no-absolute-component-path': 'error',
    '@sap-ux/fiori-tools/sap-no-br-on-return': 'error',
    '@sap-ux/fiori-tools/sap-no-commons-usage': 'error',
    '@sap-ux/fiori-tools/sap-no-dynamic-style-insertion': 'error',
    '@sap-ux/fiori-tools/sap-no-element-creation': 'error',
    '@sap-ux/fiori-tools/sap-no-exec-command': 'error',
    '@sap-ux/fiori-tools/sap-no-global-define': 'error',
    '@sap-ux/fiori-tools/sap-no-global-event': 'error',
    '@sap-ux/fiori-tools/sap-no-global-variable': 'error',
    '@sap-ux/fiori-tools/sap-no-hardcoded-color': 'error',
    '@sap-ux/fiori-tools/sap-no-hardcoded-url': 'error',
    '@sap-ux/fiori-tools/sap-no-inner-html-write': 'error',
    '@sap-ux/fiori-tools/sap-no-localstorage': 'error',
    '@sap-ux/fiori-tools/sap-no-location-reload': 'error',
    '@sap-ux/fiori-tools/sap-no-navigator': 'error',
    '@sap-ux/fiori-tools/sap-no-override-rendering': 'error',
    '@sap-ux/fiori-tools/sap-no-override-storage-prototype': 'error',
    '@sap-ux/fiori-tools/sap-no-sessionstorage': 'error',
    '@sap-ux/fiori-tools/sap-no-ui5base-prop': 'error',
    // Warning rules (alphabetical)
    '@sap-ux/fiori-tools/sap-bookmark-performance': 'warn',
    '@sap-ux/fiori-tools/sap-browser-api-warning': 'warn',
    '@sap-ux/fiori-tools/sap-cross-application-navigation': 'warn',
    '@sap-ux/fiori-tools/sap-forbidden-window-property': 'warn',
    '@sap-ux/fiori-tools/sap-message-toast': 'warn',
    '@sap-ux/fiori-tools/sap-no-dom-access': 'warn',
    '@sap-ux/fiori-tools/sap-no-dom-insertion': 'warn',
    '@sap-ux/fiori-tools/sap-no-encode-file-service': 'warn',
    '@sap-ux/fiori-tools/sap-no-global-selection': 'warn',
    '@sap-ux/fiori-tools/sap-no-history-manipulation': 'warn',
    '@sap-ux/fiori-tools/sap-no-inner-html-access': 'warn',
    '@sap-ux/fiori-tools/sap-no-jquery-device-api': 'warn',
    '@sap-ux/fiori-tools/sap-no-localhost': 'warn',
    '@sap-ux/fiori-tools/sap-no-location-usage': 'warn',
    '@sap-ux/fiori-tools/sap-no-proprietary-browser-api': 'warn',
    '@sap-ux/fiori-tools/sap-no-ui5-prop-warning': 'warn',
    '@sap-ux/fiori-tools/sap-timeout-usage': 'warn',
    '@sap-ux/fiori-tools/sap-ui5-forms': 'warn',
    '@sap-ux/fiori-tools/sap-ui5-global-eval': 'warn',
    '@sap-ux/fiori-tools/sap-ui5-legacy-factories': 'warn',
    '@sap-ux/fiori-tools/sap-ui5-legacy-jquerysap-usage': 'warn',
    '@sap-ux/fiori-tools/sap-usage-basemastercontroller': 'warn',
    // Off rules (alphabetical)
    '@sap-ux/fiori-tools/sap-browser-api-error': 'off',
    '@sap-ux/fiori-tools/sap-no-window-alert': 'off',
    '@sap-ux/fiori-tools/sap-ui5-no-private-prop': 'off'
} as Linter.RulesRecord;

const prodConfig: Linter.Config[] = [
    {
        files: [`./${webappPathRelative}/**/*.js`, `./${webappPathRelative}/**/*.ts`],

        ignores: [
            'target/**',
            `${testPathRelative}/**`,
            `${localServiceLowerCase}/**`, // Ignore everything in the 'localservice' folder
            `!${localServiceLowerCase}/**/*.{ts,js}`, // EXCEPT for .ts and .js files (that might be custom mockserver extensions)
            `${posix.join(localServiceLowerCase, 'mockserver.js')}`, // But DO ignore mockserver.js specifically
            `${localServiceUpperCase}/**`, // Ignore everything in the 'localService' folder
            `!${localServiceUpperCase}/**/*.{ts,js}`, // EXCEPT for .ts and .js files (that might be custom mockserver extensions)
            `${posix.join(localServiceUpperCase, 'mockserver.js')}`, // But DO ignore mockserver.js specifically
            'backup/**',
            '**/Gruntfile.js',
            '**/changes_preview.js',
            '**/changes_preview.ts',
            '**/gulpfile.js',
            '**/*.d.ts',
            'test/**'
        ],

        languageOptions: {
            parser: babelParser,
            parserOptions: {
                requireConfigFile: false
            },
            globals: globalsConfig
        },
        rules: {
            ...standardEslintRules,
            ...baseFioriToolsRules
        }
    }
];

const testConfig: Linter.Config[] = [
    {
        files: [`./${testPathRelative}/**/*.js`, `./${testPathRelative}/**/*.ts`],
        ignores: ['**/*.d.ts'],

        languageOptions: {
            parser: babelParser,
            parserOptions: {
                requireConfigFile: false
            },
            globals: globalsConfig
        },

        rules: {
            '@sap-ux/fiori-tools/sap-opa5-autowait-true': 'warn',
            'semi': 'warn',
            'linebreak-style': ['warn', 'unix']
        }
    }
];

const typescriptConfig: Linter.Config[] = [
    {
        files: [`./${webappPathRelative}/*.ts`, `./${webappPathRelative}/**/*.ts`],

        ignores: [
            'target/**',
            `${testPathRelative}/changes_loader.ts`,
            `${testPathRelative}/changes_preview.ts`,
            `${localServiceLowerCase}/**`, // Ignore everything in the 'localservice' folder
            `!${localServiceLowerCase}/**/*.{ts,js}`, // EXCEPT for .ts and .js files (that might be custom mockserver extensions)
            `${localServiceUpperCase}/**`, // Ignore everything in the 'localService' folder
            `!${localServiceUpperCase}/**/*.{ts,js}`, // EXCEPT for .ts and .js files (that might be custom mockserver extensions)
            'undefined/**/Example.qunit.ts',
            'backup/**',
            '**/*.d.ts'
        ],

        plugins: {
            '@typescript-eslint': typescriptEslint
        },

        languageOptions: {
            parser: tsParser,
            ecmaVersion: 5,
            sourceType: 'script',

            parserOptions: {
                projectService: true
            }
        },

        rules: {
            ...typescriptEslint.configs.recommended.rules,
            ...typescriptEslint.configs['recommended-type-checked'].rules,
            // Warning rules (alphabetical)
            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/no-unsafe-assignment': 'warn',
            '@typescript-eslint/no-unsafe-call': 'warn',
            '@typescript-eslint/no-unsafe-member-access': 'warn',
            '@typescript-eslint/no-unsafe-return': 'warn'
        }
    }
];

// Fiori language rules (for manifest.json, XML views, CDS files)
const fioriLanguageConfig: Linter.Config[] = [
    {
        files: ['**/manifest.json', '**/*.xml', '**/*.cds'],
        language: '@sap-ux/fiori-tools/fiori',
        rules: {
            // fiori tools specific rules
            '@sap-ux/fiori-tools/sap-anchor-bar-visible': 'warn',
            '@sap-ux/fiori-tools/sap-condensed-table-layout': 'warn',
            '@sap-ux/fiori-tools/sap-flex-enabled': 'warn',
            '@sap-ux/fiori-tools/sap-width-including-column-header': 'warn',
            '@sap-ux/fiori-tools/sap-copy-to-clipboard': 'warn',
            '@sap-ux/fiori-tools/sap-enable-export': 'warn',
            '@sap-ux/fiori-tools/sap-enable-paste': 'warn',
            '@sap-ux/fiori-tools/sap-creation-mode-for-table': 'warn',
            '@sap-ux/fiori-tools/sap-state-preservation-mode': 'warn',
            '@sap-ux/fiori-tools/sap-strict-uom-filtering': 'warn',
            '@sap-ux/fiori-tools/sap-table-personalization': 'warn',
            '@sap-ux/fiori-tools/sap-table-column-vertical-alignment': 'warn',
            '@sap-ux/fiori-tools/sap-no-data-field-intent-based-navigation': 'warn',
            '@sap-ux/fiori-tools/sap-text-arrangement-hidden': 'warn'
        }
    }
];

// Named configs for easy consumption
export const configs: Record<string, Linter.Config[]> = {
    // Recommended config for JavaScript & TypeScript projects (prod + test)
    recommended: [
        {
            plugins: {
                '@sap-ux/fiori-tools': {
                    meta,
                    rules: rules as Plugin['rules']
                }
            }
        },
        ...typescriptConfig,
        ...prodConfig,
        ...testConfig
    ],
    'recommended-for-s4hana': [
        {
            plugins: {
                '@sap-ux/fiori-tools': {
                    meta,
                    languages,
                    rules: rules as Plugin['rules']
                }
            }
        },
        ...typescriptConfig,
        ...prodConfig,
        ...testConfig,
        ...fioriLanguageConfig
    ]
};

export { rules } from './rules';
export default plugin;
