/**
 * @file Check "sap-no-ui5odatamodel-prop" should detect direct usage of
 *               property names of UI5 data model
 */

import type { RuleDefinition, RuleContext } from '@eslint/core';
import { type ASTNode, createPropertyChecker } from '../utils/helpers';

// THIS RULE IS DEPRECATED --> sap-no-ui5base-prop
// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const rule: RuleDefinition = {
    meta: {
        type: 'problem',
        docs: {
            description: 'fiori tools (fiori custom) ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            ui5odatamodelProp:
                'Direct usage of a private member from sap.ui.model.odata.ODataModel or sap.ui.model.odata.v2.ODataModel detected!'
        },
        schema: []
    },
    create(context: RuleContext) {
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

        const checkMemberExpression = createPropertyChecker({
            ui5odatamodelProp: PRIVATE_MEMBERS
        });

        return {
            'MemberExpression'(node: ASTNode): void {
                checkMemberExpression(node, context);
            }
        };
    }
};

export default rule;
