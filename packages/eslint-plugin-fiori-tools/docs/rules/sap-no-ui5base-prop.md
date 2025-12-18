# Disallow usage of private members of UI5 objects (sap-no-ui5base-prop)

Private members of UI5 objects must never be used in Fiori Apps. They can be changed by UI5 at anytime and the App might not work anymore.

## Rule Details

The rule checks usage of a member which has the same name as the following UI5 members:

### sap.ui.base.ManagedObject:

> _mProperties_, _mAggregations_, _mAssociations_, _mMethods_,
_oParent_, _aDelegates_, _aBeforeDelegates_, _iSuppressInvalidate_,
_oPropagatedProperties_, _oModels_, _oBindingContexts_,
_mBindingInfos_, _sBindingPath_, _mBindingParameters_,
_mBoundObjects_

### sap.ui.base.EventProvider

> _mEventRegistry_, _oEventPool_

### sap.ui.base.Event

> _oSource_, _mParameters_, _sId_

### sap.ui.model.odata.ODataModel, sap.ui.model.odata.v2.ODataModel:

> _oServiceData_, _bCountSupported_, _bCache_, _oRequestQueue_,
_aBatchOperations_, _oHandler_, _mSupportedBindingModes_,
_sDefaultBindingMode_, _bJSON_, _aPendingRequestHandles_,
_aCallAfterUpdate_, _mRequests_, _mDeferredRequests_,
_mChangedEntities_, _mChangeHandles_, _mDeferredBatchGroups_,
_mChangeBatchGroups_, _bTokenHandling_, _bWithCredentials_,
_bUseBatch_, _bRefreshAfterChange_, _sMaxDataServiceVersion_,
_bLoadMetadataAsync_, _bLoadAnnotationsJoined_, _sAnnotationURI_,
_sDefaultCountMode_, _sDefaultOperationMode_, _oMetadataLoadEvent_,
_oMetadataFailedEvent_, _sRefreshBatchGroupId_,
_sDefaultChangeBatchGroup_, _oAnnotations_, _aUrlParams_

## False Positives

As the check can not determine, whether the property used is from as SAPUI5 object, there might be false positives in case you defined a property with the same name in your own object.
In such a case you can disable the check in your coding like this:

```js
/* eslint-disable sap-no-ui5base-prop */

...some code false positives

/* eslint-enable sap-no-ui5base-prop */
```