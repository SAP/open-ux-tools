/**
 * @fileoverview Rule to flag use of sap ui5base prop
 * @author Armin Gienger
 * @ESLint			Version 0.14.0 / February 2015
 */

/*eslint-disable global-strict*/

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = function (context) {
    'use strict';

    // variables should be defined here
    var MANAGED_OBJECT_MEMBERS = [
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
    var EVENT_PROVIDER_MEMBERS = ['mEventRegistry', 'oEventPool'];

    var EVENT_MEMBERS = ['oSource', 'mParameters', 'sId'];

    var ODATA_MODEL_MEMBERS = [
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
        'oMetadata',
        'oAnnotations',
        'aUrlParams'
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

            if (typeof val === 'string' && contains(MANAGED_OBJECT_MEMBERS, val)) {
                context.report(node, 'Property ' + val + ' is a private member of sap.ui.base.ManagedObject!');
            }
            if (typeof val === 'string' && contains(EVENT_PROVIDER_MEMBERS, val)) {
                context.report(node, 'Property ' + val + ' is a private member of sap.ui.base.EventProvider!');
            }
            if (typeof val === 'string' && contains(EVENT_MEMBERS, val)) {
                context.report(node, 'Property ' + val + ' is a private member of sap.ui.base.Event!');
            }
            if (typeof val === 'string' && contains(ODATA_MODEL_MEMBERS, val)) {
                context.report(
                    node,
                    'Property ' +
                        val +
                        ' is a private member of sap.ui.model.odata.ODataModel or sap.ui.model.odata.v2.ODataModel!'
                );
            }
        }
    };
};
