import type { FioriRuleDefinition } from '../types';
import type { FioriXMLRuleDefinition } from '../language/xml/types';
import {
    REQUIRE_FLEX_ENABLED,
    REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
    DISABLE_COPY_TO_CLIPBOARD
} from '../language/diagnostics';

// Import all rules
import sapBookmarkPerformance from './sap-bookmark-performance';
import sapBrowserApiError from './sap-browser-api-error';
import sapBrowserApiWarning from './sap-browser-api-warning';
import sapCrossApplicationNavigation from './sap-cross-application-navigation';
import sapForbiddenWindowProperty from './sap-forbidden-window-property';
import sapMessageToast from './sap-message-toast';
import sapNoAbsoluteComponentPath from './sap-no-absolute-component-path';
import sapNoBrOnReturn from './sap-no-br-on-return';
import sapNoCommonsUsage from './sap-no-commons-usage';
import sapNoDomAccess from './sap-no-dom-access';
import sapNoDomInsertion from './sap-no-dom-insertion';
import sapNoDynamicStyleInsertion from './sap-no-dynamic-style-insertion';
import sapNoElementCreation from './sap-no-element-creation';
import sapNoEncodeFileService from './sap-no-encode-file-service';
import sapNoEventProp from './sap-no-event-prop';
import sapNoExecCommand from './sap-no-exec-command';
import sapNoGlobalDefine from './sap-no-global-define';
import sapNoGlobalEvent from './sap-no-global-event';
import sapNoGlobalSelection from './sap-no-global-selection';
import sapNoGlobalVariable from './sap-no-global-variable';
import sapNoHardcodedColor from './sap-no-hardcoded-color';
import sapNoHardcodedUrl from './sap-no-hardcoded-url';
import sapNoHistoryManipulation from './sap-no-history-manipulation';
import sapNoInnerHtmlAccess from './sap-no-inner-html-access';
import sapNoInnerHtmlWrite from './sap-no-inner-html-write';
import sapNoJqueryDeviceApi from './sap-no-jquery-device-api';
import sapNoLocalhost from './sap-no-localhost';
import sapNoLocalstorage from './sap-no-localstorage';
import sapNoLocationReload from './sap-no-location-reload';
import sapNoLocationUsage from './sap-no-location-usage';
import sapNoNavigator from './sap-no-navigator';
import sapNoOverrideRendering from './sap-no-override-rendering';
import sapNoOverrideStoragePrototype from './sap-no-override-storage-prototype';
import sapNoProprietaryBrowserApi from './sap-no-proprietary-browser-api';
import sapNoSessionstorage from './sap-no-sessionstorage';
import sapNoUi5PropWarning from './sap-no-ui5-prop-warning';
import sapNoUi5baseProp from './sap-no-ui5base-prop';
import sapNoUi5eventproviderProp from './sap-no-ui5eventprovider-prop';
import sapNoUi5odatamodelProp from './sap-no-ui5odatamodel-prop';
import sapNoWindowAlert from './sap-no-window-alert';
import sapOpa5AutowaitTrue from './sap-opa5-autowait-true';
import sapTimeoutUsage from './sap-timeout-usage';
import sapUi5Forms from './sap-ui5-forms';
import sapUi5GlobalEval from './sap-ui5-global-eval';
import sapUi5LegacyFactories from './sap-ui5-legacy-factories';
import sapUi5LegacyJquerysapUsage from './sap-ui5-legacy-jquerysap-usage';
import sapUi5NoPrivateProp from './sap-ui5-no-private-prop';
import sapUsageBasemastercontroller from './sap-usage-basemastercontroller';

import flexEnabledRule from './sap-flex-enabled';
import requireWidthIncludingColumnHeader from './sap-width-including-column-header';
import disableCopyToClipboard from './sap-disable-copy-to-clipboard';

import type { Rule } from 'eslint';

export const rules: Record<string, Rule.RuleModule | FioriRuleDefinition | FioriXMLRuleDefinition> = {
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
    'sap-usage-basemastercontroller': sapUsageBasemastercontroller,
    [REQUIRE_FLEX_ENABLED]: flexEnabledRule,
    [REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE]: requireWidthIncludingColumnHeader,
    [DISABLE_COPY_TO_CLIPBOARD]: disableCopyToClipboard
};
