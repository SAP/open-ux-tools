# (JS_CORE_MODEL_USAGE)

_Warning Message: Model should not be set or read from sap.ui.getCore() as we are in a shared environment!_

## Rule Details

The following patterns are considered warnings:

```js
var ui = sap.ui; var oModel = sap.ui.getCore().getModel('oModelTest');
sap.ui.getCore().setModel();
```

The following patterns are **NOT** considered warnings:

```js
myObj.model.getProperty('/path');
```

## Bug Report

In case you detect an issue with the check please open a GitHub issue [here](https://github.tools.sap/FIORI-PIPELINE/fioriPipelinesGo/issues).

## Further Reading