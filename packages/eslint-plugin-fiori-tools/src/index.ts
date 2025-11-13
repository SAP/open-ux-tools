import type { Rule } from 'eslint';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

// Named configs for easy consumption
// These use getters for lazy loading to avoid loading config files at require time
// The config files are templates meant for end users and have dependencies that
// may not be available when the plugin itself is loaded
export const configs = {
    // Recommended config for JavaScript projects (prod + test)
    get recommended() {
        const commonConfig = require('../config/eslintrc-common.js');
        const prodConfig = require('../config/eslintrc-prod.js');
        const testConfig = require('../config/eslintrc-test.js');
        return [...commonConfig, ...prodConfig, ...testConfig];
    },
    // Recommended config for TypeScript projects (prod + test)
    get 'recommended-typescript'() {
        const commonConfig = require('../config/eslintrc-common.js');
        const prodConfig = require('../config/eslintrc-prod.js');
        const testConfig = require('../config/eslintrc-test.js');
        const typescriptConfig = require('../config/eslintrc-typescript.js');
        return [...commonConfig, ...typescriptConfig, ...prodConfig, ...testConfig];
    },
    // Production code only
    get 'prod-code'() {
        const commonConfig = require('../config/eslintrc-common.js');
        const prodConfig = require('../config/eslintrc-prod.js');
        return [...commonConfig, ...prodConfig];
    },
    // Production code with TypeScript
    get 'prod-code-typescript'() {
        const commonConfig = require('../config/eslintrc-common.js');
        const prodConfig = require('../config/eslintrc-prod.js');
        const typescriptConfig = require('../config/eslintrc-typescript.js');
        return [...commonConfig, ...typescriptConfig, ...prodConfig];
    },
    // Test code only
    get 'test-code'() {
        const commonConfig = require('../config/eslintrc-common.js');
        const testConfig = require('../config/eslintrc-test.js');
        return [...commonConfig, ...testConfig];
    },
    // Test code with TypeScript
    get 'test-code-typescript'() {
        const commonConfig = require('../config/eslintrc-common.js');
        const testConfig = require('../config/eslintrc-test.js');
        const typescriptConfig = require('../config/eslintrc-typescript.js');
        return [...commonConfig, ...typescriptConfig, ...testConfig];
    }
};

// Legacy config export for backward compatibility
// @deprecated Use `configs` instead
export const config = {
    get defaultTS() {
        const commonConfig = require('../config/eslintrc-common.js');
        const prodConfig = require('../config/eslintrc-prod.js');
        const testConfig = require('../config/eslintrc-test.js');
        const typescriptConfig = require('../config/eslintrc-typescript.js');
        return [...commonConfig, ...prodConfig, ...testConfig, ...typescriptConfig];
    },
    get defaultJS() {
        const commonConfig = require('../config/eslintrc-common.js');
        const prodConfig = require('../config/eslintrc-prod.js');
        const testConfig = require('../config/eslintrc-test.js');
        return [...commonConfig, ...prodConfig, ...testConfig];
    },
    get testCode() {
        const commonConfig = require('../config/eslintrc-common.js');
        const testConfig = require('../config/eslintrc-test.js');
        const typescriptConfig = require('../config/eslintrc-typescript.js');
        return [...commonConfig, ...typescriptConfig, ...testConfig];
    },
    get prodCode() {
        const commonConfig = require('../config/eslintrc-common.js');
        const prodConfig = require('../config/eslintrc-prod.js');
        const typescriptConfig = require('../config/eslintrc-typescript.js');
        return [...commonConfig, ...typescriptConfig, ...prodConfig];
    }
};

// Default export following ESLint 9 plugin structure
// This is the recommended way to export plugins in ESLint 9
const plugin = {
    meta,
    configs,
    rules
};

export default plugin;
