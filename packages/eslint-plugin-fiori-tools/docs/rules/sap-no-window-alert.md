# Disallow usage of window.alert (sap-no-window-alert)

A window.alert statement should not be part of the code that is committed to GIT!

Instead, sap.m.MessageBox should be used. Please check the [UI5 API](https://ui5.sap.com/#/api/sap.m.MessageBox) reference for an example how to do it.

The following patterns are considered warnings:

```js
window.alert('hello world');
```

## Bug Report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
