/**
 * @file Check "sap-no-ui5odatamodel-prop" should detect direct usage of
 *               property names of UI5 data model
 * @ESLint Version 0.14.0 / February 2015
 */

import type { Rule } from 'eslint';

// THIS RULE IS DEPRECATED --> sap-no-ui5base-prop
// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Fiori custom ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            ui5odatamodelProp:
                'Direct usage of a private member from sap.ui.model.odata.ODataModel or sap.ui.model.odata.v2.ODataModel detected!'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        // Alphabetical list of the "property names" from UI5 data model which this
        // check shall detect
        const PRIVATE_MEMBERS = [
            'aBatchOperations',
            'aCallAfterUpdate',
            'aPendingRequestHandles',
            'aUrlParams',
            'bCache',
            'bCountSupported',
            'bJSON',
            'bLoadAnnotationsJoined',
            'bLoadMetadataAsync',
            'bRefreshAfterChange',
            'bTokenHandling',
            'bUseBatch',
            'bWithCredentials',
            'mChangeBatchGroups',
            'mChangedEntities',
            'mChangeHandles',
            'mDeferredBatchGroups',
            'mDeferredRequests',
            'mRequests',
            'mSupportedBindingModes',
            'mSupportedBindingModes',
            'oAnnotations',
            'oData',
            'oHandler',
            /*"oMetadata", */ 'oMetadataFailedEvent',
            'oMetadataLoadEvent',
            'oRequestQueue',
            'oServiceData',
            'sAnnotationURI',
            'sDefaultBindingMode',
            'sDefaultChangeBatchGroup',
            'sDefaultCountMode',
            'sDefaultOperationMode',
            'sMaxDataServiceVersion',
            'sRefreshBatchGroupId'
        ];

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         *
         * @param a
         * @param obj
         */
        function contains(a, obj) {
            for (let i = 0; i < a.length; i++) {
                if (obj === a[i]) {
                    return true;
                }
            }
            return false;
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'MemberExpression': function (node) {
                if (!node.property || !('name' in node.property)) {
                    return;
                }
                const val = node.property.name;

                if (typeof val === 'string' && contains(PRIVATE_MEMBERS, val)) {
                    context.report({
                        node: node,
                        messageId: 'ui5odatamodelProp'
                        // data: {
                        //     property: val
                        // }
                    });
                }
            }
        };
    }
};

export default rule;
