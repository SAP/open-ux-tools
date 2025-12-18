# Detect window.navigator usage (sap-no-navigator)

## Rule Details

The `window.navigator` object should not be used at all, instead the sap.ui.Device API should be used.

The following patterns are considered warnings:

```js
var language = navigator.language;
var name = navigator.appCodeName;
```

Warning message: _navigator usage is forbidden, use `sap.ui.Device` API instead._

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

