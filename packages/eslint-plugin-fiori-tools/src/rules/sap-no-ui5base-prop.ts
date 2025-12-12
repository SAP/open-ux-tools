/**
 * @file Rule to flag use of sap ui5base prop
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            managedObjectProp: 'Property {{property}} is a private member of sap.ui.base.ManagedObject!',
            odataModelProp:
                'Property {{property}} is a private member of sap.ui.model.odata.ODataModel or sap.ui.model.odata.v2.ODataModel!',
            eventProviderProp: 'Property {{property}} is a private member of sap.ui.base.EventProvider!',
            eventProp: 'Property {{property}} is a private member of sap.ui.base.Event!'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        // variables should be defined here
        const MANAGED_OBJECT_MEMBERS = [
            'mProperties',
            'mAggregations',
            'mAssociations',
            'mMethods',
            'oParent',
            'aDelegates',
            'aBeforeDelegates',
            'iSuppressInvalidate',
            'oPropagatedProperties',
            'oModels',
            'oBindingContexts',
            'mBindingInfos',
            'sBindingPath',
            'mBindingParameters',
            'mBoundObjects'
        ];
        const EVENT_PROVIDER_MEMBERS = ['mEventRegistry', 'oEventPool'];

        const EVENT_MEMBERS = ['oSource', 'mParameters', 'sId'];

        // oMetadadata has been removed from the of forbidden oDataModel members as there is no API available (June 2015, info by Malte Wedel)
        const ODATA_MODEL_MEMBERS = [
            'oServiceData',
            'bCountSupported',
            'bCache',
            'oRequestQueue',
            'aBatchOperations',
            'oHandler',
            'mSupportedBindingModes',
            'sDefaultBindingMode',
            'bJSON',
            'aPendingRequestHandles',
            'aCallAfterUpdate',
            'mRequests',
            'mDeferredRequests',
            'mChangedEntities',
            'mChangeHandles',
            'mDeferredBatchGroups',
            'mChangeBatchGroups',
            'bTokenHandling',
            'bWithCredentials',
            'bUseBatch',
            'bRefreshAfterChange',
            'sMaxDataServiceVersion',
            'bLoadMetadataAsync',
            'bLoadAnnotationsJoined',
            'sAnnotationURI',
            'sDefaultCountMode',
            'sDefaultOperationMode',
            'oMetadataLoadEvent',
            'oMetadataFailedEvent',
            'sRefreshBatchGroupId',
            'sDefaultChangeBatchGroup',
            /*"oMetadata", */ 'oAnnotations',
            'aUrlParams'
        ];

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         * Check if an array contains a specific object.
         *
         * @param a The array to search in
         * @param obj The object to search for
         * @returns True if the array contains the object
         */
        function contains(a, obj) {
            return a.includes(obj);
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'MemberExpression': function (node): void {
                if (!node.property || !('name' in node.property)) {
                    return;
                }
                const val = node.property.name;

                if (typeof val === 'string' && contains(MANAGED_OBJECT_MEMBERS, val)) {
                    context.report({ node, messageId: 'managedObjectProp', data: { property: val } });
                }
                if (typeof val === 'string' && contains(EVENT_PROVIDER_MEMBERS, val)) {
                    context.report({ node, messageId: 'eventProviderProp', data: { property: val } });
                }
                if (typeof val === 'string' && contains(EVENT_MEMBERS, val)) {
                    context.report({ node, messageId: 'eventProp', data: { property: val } });
                }
                if (typeof val === 'string' && contains(ODATA_MODEL_MEMBERS, val)) {
                    context.report({
                        node,
                        messageId: 'odataModelProp',
                        data: { property: val }
                    });
                }
            }
        };
    }
};

export default rule;
