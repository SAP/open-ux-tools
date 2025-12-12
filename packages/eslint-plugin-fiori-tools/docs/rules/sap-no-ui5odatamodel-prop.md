# Disallow usage of private members from sap.ui.model.odata.ODataModel (sap-no-ui5odatamodel-prop)

**DEPRECATED: This rule is deprecated. Use `sap-no-ui5base-prop` instead.**

Direct usage of private members from `sap.ui.model.odata.ODataModel` or `sap.ui.model.odata.v2.ODataModel` must never be used in Fiori Apps. They can be changed by UI5 at any time and the App might not work anymore.

## Rule Details

This rule detects direct usage of private property names from UI5 OData models.

The following private properties are detected:

- `aBatchOperations`
- `aCallAfterUpdate`
- `aPendingRequestHandles`
- `aUrlParams`
- `bCache`
- `bCountSupported`
- `bJSON`
- `bLoadAnnotationsJoined`
- `bLoadMetadataAsync`
- `bRefreshAfterChange`
- `bTokenHandling`
- `bUseBatch`
- `bWithCredentials`
- `mChangeBatchGroups`
- `mChangedEntities`
- `mChangeHandles`
- `mDeferredBatchGroups`
- `mDeferredRequests`
- `mRequests`
- `mSupportedBindingModes`
- `oAnnotations`
- `oData`
- `oHandler`
- `oMetadataFailedEvent`
- `oMetadataLoadEvent`
- `oRequestQueue`
- `oServiceData`
- `sAnnotationURI`
- `sDefaultBindingMode`
- `sDefaultChangeBatchGroup`
- `sDefaultCountMode`
- `sDefaultOperationMode`
- `sMaxDataServiceVersion`
- `sRefreshBatchGroupId`

### Warning Message

**Direct usage of a private member from sap.ui.model.odata.ODataModel or sap.ui.model.odata.v2.ODataModel detected!**

The following patterns are considered warnings:

```js
// Accessing private properties of ODataModel
var oModel = this.getView().getModel();
var serviceData = oModel.oServiceData; // Warning: private property
var requestQueue = oModel.oRequestQueue; // Warning: private property
var batchOps = oModel.aBatchOperations; // Warning: private property
```

The following patterns are not considered warnings:

```js
// Using public API methods instead
var oModel = this.getView().getModel();
var serviceMetadata = oModel.getServiceMetadata(); // OK: using public API
var annotations = oModel.getServiceAnnotations(); // OK: using public API
oModel.setUseBatch(true); // OK: using public API
```

## False Positives

There might be cases where the check produces a false positive, i.e. you receive a warning but your code is correct and complies to the UI5 guidelines.
In such a case, you can deactivate the rule by placing the following pseudo-comment block around your code.
**Please make sure to have your code reviewed by a colleague before you enter such a pseudo-comment.**

You can disable and enable back warnings of this rule:

```js
/*eslint-disable sap-no-ui5odatamodel-prop*/
   <your code>
/*eslint-enable sap-no-ui5odatamodel-prop*/
```

## Bug Report

In case you detect an issue with the check please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [SAPUI5 ODataModel API Reference](https://ui5.sap.com/#/api/sap.ui.model.odata.ODataModel)
- [SAPUI5 ODataModel v2 API Reference](https://ui5.sap.com/#/api/sap.ui.model.odata.v2.ODataModel)

## Release Information

This rule is part of the Fiori Tools ESLint plugin.
