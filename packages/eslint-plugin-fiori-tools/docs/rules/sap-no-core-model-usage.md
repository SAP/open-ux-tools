# Avoid `getModel()` on `sap.ui.getCore()` (sap-no-core-model-usage)

Using `sap.ui.getCore().getModel()` or `sap.ui.getCore().setModel()` accesses a shared, global model registry.
In component-based Fiori applications this causes unexpected cross-contamination between components.
Use the component's own model API instead.

## Rule Details

The following patterns are considered warnings:

```js
var oModel = sap.ui.getCore().getModel('oModelTest');
sap.ui.getCore().setModel();
```

The following patterns are **NOT** considered warnings:

```js
myObj.model.getProperty('/path');
```

## Bug Report

In case you detect an issue with the check please open a GitHub issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading
