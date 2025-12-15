/**
 * @file Rule to flag use of sap ui5base prop
 */

import type { Rule } from 'eslint';
import { type ASTNode, createPropertyChecker } from '../utils/helpers';

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

        const checkMemberExpression = createPropertyChecker({
            managedObjectProp: MANAGED_OBJECT_MEMBERS,
            eventProviderProp: EVENT_PROVIDER_MEMBERS,
            eventProp: EVENT_MEMBERS,
            odataModelProp: ODATA_MODEL_MEMBERS
        });

        return {
            'MemberExpression'(node: ASTNode): void {
                checkMemberExpression(node, context);
            }
        };
    }
};

export default rule;
