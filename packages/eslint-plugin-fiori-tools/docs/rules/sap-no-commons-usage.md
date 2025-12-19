# Detects the usage of sap.ui.commons objects (sap-no-commons-usage)

As per Fiori Architectural Guidelines controls from _sap.ui.commons_ are not allowed. Instead _sap.m_ controls should be used.

_Warning Message_: Usage of sap.ui.commons controls is forbidden, please use controls from sap.m library.

The following patterns are considered warnings:

```js
sap.ui.define(['sap.ui.commons.anyControl'], function (control) {
  doSomething.with(control);
});
```

```js
function createControl() {
  return new sap.ui.commons.Control();
}
```

## Bug Report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
