# Detect the usage of document.queryCommandSupported (sap-no-br-on-return)

This rule checks any call of queryCommandSupported on document. Calls with argument `sap-no-br-on-return` are not allowed because this is a browser specific command.

## Rule Details

Warning message: _`insertBrOnReturn` is not allowed since it is a Mozilla specific method, other browsers don't support that._

The following patterns are considered warnings:

```js
var abc = document.queryCommandSupported('insertBrOnReturn');
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading


