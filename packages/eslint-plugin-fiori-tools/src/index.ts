import type { Rule, Linter } from 'eslint';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import js from '@eslint/js';
import babelParser from '@babel/eslint-parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';

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

// Import all rules
import sapBookmarkPerformance from './rules/sap-bookmark-performance';
import sapBrowserApiError from './rules/sap-browser-api-error';
import sapBrowserApiWarning from './rules/sap-browser-api-warning';
import sapCrossApplicationNavigation from './rules/sap-cross-application-navigation';
import sapForbiddenWindowProperty from './rules/sap-forbidden-window-property';
import sapMessageToast from './rules/sap-message-toast';
import sapNoAbsoluteComponentPath from './rules/sap-no-absolute-component-path';
import sapNoBrOnReturn from './rules/sap-no-br-on-return';
import sapNoCommonsUsage from './rules/sap-no-commons-usage';
import sapNoDomAccess from './rules/sap-no-dom-access';
import sapNoDomInsertion from './rules/sap-no-dom-insertion';
import sapNoDynamicStyleInsertion from './rules/sap-no-dynamic-style-insertion';
import sapNoElementCreation from './rules/sap-no-element-creation';
import sapNoEncodeFileService from './rules/sap-no-encode-file-service';
import sapNoEventProp from './rules/sap-no-event-prop';
import sapNoExecCommand from './rules/sap-no-exec-command';
import sapNoGlobalDefine from './rules/sap-no-global-define';
import sapNoGlobalEvent from './rules/sap-no-global-event';
import sapNoGlobalSelection from './rules/sap-no-global-selection';
import sapNoGlobalVariable from './rules/sap-no-global-variable';
import sapNoHardcodedColor from './rules/sap-no-hardcoded-color';
import sapNoHardcodedUrl from './rules/sap-no-hardcoded-url';
import sapNoHistoryManipulation from './rules/sap-no-history-manipulation';
import sapNoInnerHtmlAccess from './rules/sap-no-inner-html-access';
import sapNoInnerHtmlWrite from './rules/sap-no-inner-html-write';
import sapNoJqueryDeviceApi from './rules/sap-no-jquery-device-api';
import sapNoLocalhost from './rules/sap-no-localhost';
import sapNoLocalstorage from './rules/sap-no-localstorage';
import sapNoLocationReload from './rules/sap-no-location-reload';
import sapNoLocationUsage from './rules/sap-no-location-usage';
import sapNoNavigator from './rules/sap-no-navigator';
import sapNoOverrideRendering from './rules/sap-no-override-rendering';
import sapNoOverrideStoragePrototype from './rules/sap-no-override-storage-prototype';
import sapNoProprietaryBrowserApi from './rules/sap-no-proprietary-browser-api';
import sapNoSessionstorage from './rules/sap-no-sessionstorage';
import sapNoUi5PropWarning from './rules/sap-no-ui5-prop-warning';
import sapNoUi5baseProp from './rules/sap-no-ui5base-prop';
import sapNoUi5eventproviderProp from './rules/sap-no-ui5eventprovider-prop';
import sapNoUi5odatamodelProp from './rules/sap-no-ui5odatamodel-prop';
import sapNoWindowAlert from './rules/sap-no-window-alert';
import sapOpa5AutowaitTrue from './rules/sap-opa5-autowait-true';
import sapTimeoutUsage from './rules/sap-timeout-usage';
import sapUi5Forms from './rules/sap-ui5-forms';
import sapUi5GlobalEval from './rules/sap-ui5-global-eval';
import sapUi5LegacyFactories from './rules/sap-ui5-legacy-factories';
import sapUi5LegacyJquerysapUsage from './rules/sap-ui5-legacy-jquerysap-usage';
import sapUi5NoPrivateProp from './rules/sap-ui5-no-private-prop';
import sapUsageBasemastercontroller from './rules/sap-usage-basemastercontroller';

// Plugin meta information (required for ESLint 9)
export const meta = {
    name: '@sap-ux/eslint-plugin-fiori-tools',
    version: packageJson.version
};

const rulesMap: Record<string, Rule.RuleModule> = {
    'sap-bookmark-performance': sapBookmarkPerformance,
    'sap-browser-api-error': sapBrowserApiError,
    'sap-browser-api-warning': sapBrowserApiWarning,
    'sap-cross-application-navigation': sapCrossApplicationNavigation,
    'sap-forbidden-window-property': sapForbiddenWindowProperty,
    'sap-message-toast': sapMessageToast,
    'sap-no-absolute-component-path': sapNoAbsoluteComponentPath,
    'sap-no-br-on-return': sapNoBrOnReturn,
    'sap-no-commons-usage': sapNoCommonsUsage,
    'sap-no-dom-access': sapNoDomAccess,
    'sap-no-dom-insertion': sapNoDomInsertion,
    'sap-no-dynamic-style-insertion': sapNoDynamicStyleInsertion,
    'sap-no-element-creation': sapNoElementCreation,
    'sap-no-encode-file-service': sapNoEncodeFileService,
    'sap-no-event-prop': sapNoEventProp,
    'sap-no-exec-command': sapNoExecCommand,
    'sap-no-global-define': sapNoGlobalDefine,
    'sap-no-global-event': sapNoGlobalEvent,
    'sap-no-global-selection': sapNoGlobalSelection,
    'sap-no-global-variable': sapNoGlobalVariable,
    'sap-no-hardcoded-color': sapNoHardcodedColor,
    'sap-no-hardcoded-url': sapNoHardcodedUrl,
    'sap-no-history-manipulation': sapNoHistoryManipulation,
    'sap-no-inner-html-access': sapNoInnerHtmlAccess,
    'sap-no-inner-html-write': sapNoInnerHtmlWrite,
    'sap-no-jquery-device-api': sapNoJqueryDeviceApi,
    'sap-no-localhost': sapNoLocalhost,
    'sap-no-localstorage': sapNoLocalstorage,
    'sap-no-location-reload': sapNoLocationReload,
    'sap-no-location-usage': sapNoLocationUsage,
    'sap-no-navigator': sapNoNavigator,
    'sap-no-override-rendering': sapNoOverrideRendering,
    'sap-no-override-storage-prototype': sapNoOverrideStoragePrototype,
    'sap-no-proprietary-browser-api': sapNoProprietaryBrowserApi,
    'sap-no-sessionstorage': sapNoSessionstorage,
    'sap-no-ui5-prop-warning': sapNoUi5PropWarning,
    'sap-no-ui5base-prop': sapNoUi5baseProp,
    'sap-no-ui5eventprovider-prop': sapNoUi5eventproviderProp,
    'sap-no-ui5odatamodel-prop': sapNoUi5odatamodelProp,
    'sap-no-window-alert': sapNoWindowAlert,
    'sap-opa5-autowait-true': sapOpa5AutowaitTrue,
    'sap-timeout-usage': sapTimeoutUsage,
    'sap-ui5-forms': sapUi5Forms,
    'sap-ui5-global-eval': sapUi5GlobalEval,
    'sap-ui5-legacy-factories': sapUi5LegacyFactories,
    'sap-ui5-legacy-jquerysap-usage': sapUi5LegacyJquerysapUsage,
    'sap-ui5-no-private-prop': sapUi5NoPrivateProp,
    'sap-usage-basemastercontroller': sapUsageBasemastercontroller
};

// Build rules object with both standard and legacy (fiori-custom/) prefixes
// The fiori-custom/ prefix is maintained for backward compatibility with
// the original eslint-plugin-fiori-custom package that this replaced
export const rules: Record<string, Rule.RuleModule> = {};
Object.keys(rulesMap).forEach((ruleName: string) => {
    rules[ruleName] = rulesMap[ruleName];
    // Legacy compatibility: also register with fiori-custom/ prefix
    rules[`fiori-custom/${ruleName}`] = rulesMap[ruleName];
});

const createPluginConfig = (): Linter.Config => ({
    plugins: {
        '@sap-ux/fiori-tools': {
            meta,
            rules
        }
    }
});

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
    recommended: [createPluginConfig(), ...commonConfig, ...typescriptConfig, ...prodConfig, ...testConfig],
    // Recommended for S/4HANA config for JavaScript & TypeScript projects
    'recommended-for-s4hana': [createPluginConfig(), ...commonConfig, ...typescriptConfig, ...prodConfig, ...testConfig]
};

// Default export following ESLint 9 plugin structure
// This is the recommended way to export plugins in ESLint 9
const plugin: {
    meta: typeof meta;
    configs: Record<string, Linter.Config[]>;
    rules: Record<string, Rule.RuleModule>;
} = {
    meta,
    configs,
    rules
};

export default plugin;
