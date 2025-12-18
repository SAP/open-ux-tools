# Detect the usage of forbidden window properties (sap-forbidden-window-property)

## Rule Details

Warning message: _Usage of a forbidden window property._

The following patterns are considered warnings:

```js
var top = window.top;
window.addEventListener(listener);
```

## Bug report

In case you detect a problem with this check, please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

