# Detect definition of globals via window object (sap-no-global-define)

## Rule Details

Global variables should not be used in Fiori Apps. This check detects global definitions by attachments to the `window` object or override of `window` properties.

The following patterns are considered warnings:

```js
window.MyVar = 'A';
window.name = 'New Name';
```

Warning message: _Definition of global variable/api in `window` object is not permitted._

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

