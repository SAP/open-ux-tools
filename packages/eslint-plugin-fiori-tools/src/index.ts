import { readFileSync } from 'node:fs';
import { join, relative, posix } from 'node:path';
import type { Linter } from 'eslint';
import type { Plugin } from '@eslint/config-helpers';
import js from '@eslint/js';
import babelParser from '@babel/eslint-parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import { rules } from './rules';
import { FioriLanguage } from './language/fiori-language';
import { createSyncFn } from 'synckit';
import type { getPathMappings } from '@sap-ux/project-access';
import { uniformUrl } from './project-context/utils';
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
    rules,
    processors: {}
};

/**
 * Common configuration shared across all config presets.
 */
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

const prodConfig: Linter.Config[] = [
    {
        files: [`./${webappPathRelative}/**/*.js`, `./${webappPathRelative}/**/*.ts`],

        ignores: [
            'target/**',
            `${testPathRelative}/**`,
            `${posix.join(webappPathRelative, 'localservice')}/**`, // Ignore everything in the 'localservice' folder
            `!${posix.join(webappPathRelative, 'localservice')}/**/*.{ts,js}`, // EXCEPT for .ts and .js files (that might be custom mockserver extensions)
            `${posix.join(webappPathRelative, 'localService')}/**`, // Ignore everything in the 'localService' folder
            `!${posix.join(webappPathRelative, 'localService')}/**/*.{ts,js}`, // EXCEPT for .ts and .js files (that might be custom mockserver extensions)
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
        files: [`./${testPathRelative}/**/*.js`, `./${testPathRelative}/**/*.ts`],
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
        files: [`./${webappPathRelative}/*.ts`, `./${webappPathRelative}/**/*.ts`],

        ignores: [
            'target/**',
            `${testPathRelative}/changes_loader.ts`,
            `${testPathRelative}/changes_preview.ts`,
            `${posix.join(webappPathRelative, 'localservice')}/**`, // Ignore everything in the 'localservice' folder
            `!${posix.join(webappPathRelative, 'localservice')}/**/*.{ts,js}`, // EXCEPT for .ts and .js files (that might be custom mockserver extensions)
            `${posix.join(webappPathRelative, 'localService')}/**`, // Ignore everything in the 'localService' folder
            `!${posix.join(webappPathRelative, 'localService')}/**/*.{ts,js}`, // EXCEPT for .ts and .js files (that might be custom mockserver extensions)
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
                '@sap-ux/fiori-tools/sap-flex-enabled': 'warn',
                '@sap-ux/fiori-tools/sap-width-including-column-header': 'warn',
                '@sap-ux/fiori-tools/sap-copy-to-clipboard': 'warn',
                '@sap-ux/fiori-tools/sap-enable-export': 'warn',
                '@sap-ux/fiori-tools/sap-enable-paste': 'warn',
                '@sap-ux/fiori-tools/sap-creation-mode-for-table': 'warn',
                '@sap-ux/fiori-tools/sap-state-preservation-mode': 'warn',
                '@sap-ux/fiori-tools/sap-table-column-vertical-alignment': 'warn'
            }
        }
    ]
};

export { rules } from './rules';
export default plugin;
