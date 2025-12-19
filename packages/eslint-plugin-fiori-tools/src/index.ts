import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Rule, Linter } from 'eslint';
import type { Plugin } from '@eslint/config-helpers';
import js from '@eslint/js';
import babelParser from '@babel/eslint-parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import { rules } from './rules';
import { FioriLanguage } from './language/fiori-language';

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


// Plugin meta information (required for ESLint 9)
export const meta = {
    name: '@sap-ux/eslint-plugin-fiori-tools',
    version: packageJson.version
};

export const languages = {
    fiori: new FioriLanguage()
};

// Default export following ESLint 9 plugin structure
// This is the recommended way to export plugins in ESLint 9
const plugin: Plugin = {
    meta: {
        name: '@sap-ux/eslint-plugin-fiori-tools',
        version: '0.0.1',
        namespace: '@sap-ux/fiori-tools'
    },
    languages,
    rules,
    processors: {}
};

// Config definitions as constants
const commonConfig: Linter.Config[] = [
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                sap: 'readonly'
            }
        }
    }
];

const prodConfig: Linter.Config[] = [
    {
        files: ['./webapp/**/*.js', './webapp/**/*.ts'],

        ignores: [
            'target/**',
            'webapp/test/**',
            'webapp/localservice/**',
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
            }
        },

        rules: {
            ...js.configs.recommended.rules,
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
        }
    }
];

const testConfig: Linter.Config[] = [
    {
        files: ['webapp/test/**/*.js', 'webapp/test/**/*.ts'],
        ignores: ['**/*.d.ts'],

        languageOptions: {
            parser: babelParser,
            parserOptions: {
                requireConfigFile: false
            }
        },

        rules: {
            '@sap-ux/fiori-tools/sap-opa5-autowait-true': 'warn'
        }
    }
];

const typescriptConfig: Linter.Config[] = [
    {
        files: ['./webapp/*.ts', './webapp/**/*.ts'],

        ignores: [
            'target/**',
            'webapp/test/changes_loader.ts',
            'webapp/test/changes_preview.ts',
            'webapp/localservice/**',
            'webapp/localService/**',
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

// Named configs for easy consumption
export const configs: Record<string, Linter.Config[]> = {
    // Recommended config for JavaScript & TypeScript projects (prod + test)
    recommended: [
        {
            plugins: {
                '@sap-ux/fiori-tools': {
                    meta,
                    rules
                }
            }
        },
        ...commonConfig,
        ...typescriptConfig,
        ...prodConfig,
        ...testConfig
    ],
    // Recommended for S/4HANA config for JavaScript & TypeScript projects
    'recommended-for-s4hana': [
        {
            plugins: {
                '@sap-ux/fiori-tools': {
                    meta,
                    languages,
                    rules
                }
            }
        },
        ...commonConfig,
        ...typescriptConfig,
        ...prodConfig,
        ...testConfig,
        {
            files: ['**/manifest.json', '**/*.xml', '**/*.cds'],
            language: '@sap-ux/fiori-tools/fiori',
            rules: {
                '@sap-ux/fiori-tools/sap-require-flex-enabled': 'warn',
                '@sap-ux/fiori-tools/sap-require-width-including-column-header': 'warn'
            }
        }
    ]
};

export { rules };
export default plugin;
