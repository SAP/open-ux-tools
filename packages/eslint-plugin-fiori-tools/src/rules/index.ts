import type { FioriRuleDefinition } from '../types.js';
import type { FioriXMLRuleDefinition } from '../language/xml/types.js';
import {
    ANCHOR_BAR_VISIBLE,
    FLEX_ENABLED,
    WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
    COPY_TO_CLIPBOARD,
    CREATION_MODE_FOR_TABLE,
    ENABLE_EXPORT,
    ENABLE_PASTE,
    STATE_PRESERVATION_MODE,
    NO_DATA_FIELD_INTENT_BASED_NAVIGATION,
    CONDENSED_TABLE_LAYOUT,
    TABLE_COLUMN_VERTICAL_ALIGNMENT,
    TABLE_PERSONALIZATION,
    TEXT_ARRANGEMENT_HIDDEN,
    STRICT_UOM_FILTERING
} from '../language/diagnostics.js';

// Import all rules
import sapBookmarkPerformance from './sap-bookmark-performance.js';
import sapBrowserApiError from './sap-browser-api-error.js';
import sapBrowserApiWarning from './sap-browser-api-warning.js';
import sapCrossApplicationNavigation from './sap-cross-application-navigation.js';
import sapForbiddenWindowProperty from './sap-forbidden-window-property.js';
import sapMessageToast from './sap-message-toast.js';
import sapNoAbsoluteComponentPath from './sap-no-absolute-component-path.js';
import sapNoBrOnReturn from './sap-no-br-on-return.js';
import sapNoCommonsUsage from './sap-no-commons-usage.js';
import sapNoDomAccess from './sap-no-dom-access.js';
import sapNoDomInsertion from './sap-no-dom-insertion.js';
import sapNoDynamicStyleInsertion from './sap-no-dynamic-style-insertion.js';
import sapNoElementCreation from './sap-no-element-creation.js';
import sapNoEncodeFileService from './sap-no-encode-file-service.js';
import sapNoEventProp from './sap-no-event-prop.js';
import sapNoExecCommand from './sap-no-exec-command.js';
import sapNoGlobalDefine from './sap-no-global-define.js';
import sapNoGlobalEvent from './sap-no-global-event.js';
import sapNoGlobalSelection from './sap-no-global-selection.js';
import sapNoGlobalVariable from './sap-no-global-variable.js';
import sapNoHardcodedColor from './sap-no-hardcoded-color.js';
import sapNoHardcodedUrl from './sap-no-hardcoded-url.js';
import sapNoHistoryManipulation from './sap-no-history-manipulation.js';
import sapNoInnerHtmlAccess from './sap-no-inner-html-access.js';
import sapNoInnerHtmlWrite from './sap-no-inner-html-write.js';
import sapNoJqueryDeviceApi from './sap-no-jquery-device-api.js';
import sapNoLocalhost from './sap-no-localhost.js';
import sapNoLocalstorage from './sap-no-localstorage.js';
import sapNoLocationReload from './sap-no-location-reload.js';
import sapNoLocationUsage from './sap-no-location-usage.js';
import sapNoNavigator from './sap-no-navigator.js';
import sapNoOverrideRendering from './sap-no-override-rendering.js';
import sapNoOverrideStoragePrototype from './sap-no-override-storage-prototype.js';
import sapNoProprietaryBrowserApi from './sap-no-proprietary-browser-api.js';
import sapNoSessionstorage from './sap-no-sessionstorage.js';
import sapNoUi5PropWarning from './sap-no-ui5-prop-warning.js';
import sapNoUi5baseProp from './sap-no-ui5base-prop.js';
import sapNoUi5eventproviderProp from './sap-no-ui5eventprovider-prop.js';
import sapNoUi5odatamodelProp from './sap-no-ui5odatamodel-prop.js';
import sapNoWindowAlert from './sap-no-window-alert.js';
import sapOpa5AutowaitTrue from './sap-opa5-autowait-true.js';
import sapTimeoutUsage from './sap-timeout-usage.js';
import sapUi5Forms from './sap-ui5-forms.js';
import sapUi5GlobalEval from './sap-ui5-global-eval.js';
import sapUi5LegacyFactories from './sap-ui5-legacy-factories.js';
import sapUi5LegacyJquerysapUsage from './sap-ui5-legacy-jquerysap-usage.js';
import sapUi5NoPrivateProp from './sap-ui5-no-private-prop.js';
import sapUsageBasemastercontroller from './sap-usage-basemastercontroller.js';

import anchorBarVisibleRule from './sap-anchor-bar-visible.js';
import flexEnabledRule from './sap-flex-enabled.js';
import requireWidthIncludingColumnHeader from './sap-width-including-column-header.js';
import creationModeForTable from './sap-creation-mode-for-table.js';
import statePreservationMode from './sap-state-preservation-mode.js';
import strictUomFilteringRule from './sap-strict-uom-filtering.js';
import copyToClipboard from './sap-copy-to-clipboard.js';
import enableExport from './sap-enable-export.js';
import enablePaste from './sap-enable-paste.js';
import tablePersonalization from './sap-table-personalization.js';
import tableColumnVerticalAlignment from './sap-table-column-vertical-alignment.js';
import noDataFieldIntentBasedNavigation from './sap-no-data-field-intent-based-navigation.js';
import condensedTableLayout from './sap-condensed-table-layout.js';
import textArrangementHidden from './sap-text-arrangement-hidden.js';

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
    [ANCHOR_BAR_VISIBLE]: anchorBarVisibleRule,
    [FLEX_ENABLED]: flexEnabledRule,
    [WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE]: requireWidthIncludingColumnHeader,
    [COPY_TO_CLIPBOARD]: copyToClipboard,
    [ENABLE_EXPORT]: enableExport,
    [ENABLE_PASTE]: enablePaste,
    [CREATION_MODE_FOR_TABLE]: creationModeForTable,
    [STATE_PRESERVATION_MODE]: statePreservationMode,
    [NO_DATA_FIELD_INTENT_BASED_NAVIGATION]: noDataFieldIntentBasedNavigation,
    [CONDENSED_TABLE_LAYOUT]: condensedTableLayout,
    [STRICT_UOM_FILTERING]: strictUomFilteringRule,
    [TABLE_COLUMN_VERTICAL_ALIGNMENT]: tableColumnVerticalAlignment,
    [TABLE_PERSONALIZATION]: tablePersonalization,
    [TEXT_ARRANGEMENT_HIDDEN]: textArrangementHidden
};
