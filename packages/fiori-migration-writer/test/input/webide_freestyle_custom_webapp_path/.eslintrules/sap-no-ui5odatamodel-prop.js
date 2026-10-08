/**
 * @fileoverview Check "sap-no-ui5odatamodel-prop" should detect direct usage of
 *               property names of UI5 data model
 * @author Developer A (D000001) with advice from Developer B (D000002)
 * @ESLint Version 0.14.0 / February 2015
 */

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = function (context) {
    'use strict';
    // Alphabetical list of the "property names" from UI5 data model which this
    // check shall detect
    var PRIVATE_MEMBERS = [
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
        'oMetadata',
        'oMetadataFailedEvent',
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
    function contains(a, obj) {
        for (var i = 0; i < a.length; i++) {
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
            var val = node.property.name;

            if (typeof val === 'string' && contains(PRIVATE_MEMBERS, val)) {
                context.report(
                    node,
                    'Direct usage of a private member from sap.ui.model.odata.ODataModel or sap.ui.model.odata.v2.ODataModel detected!'
                );
            }
        }
    };
};
