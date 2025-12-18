# Disallow direct DOM insertion (sap-no-element-creation)

The UI5 guidelines do not allow creation of elements in the DOM. Instead usage of a custom control should be considered.

## Rule Details

The rule detects all method calls of "createElement", "createTextNode", "createElementNS", "createDocumentFragment", "createComment", "createAttribute" and "createEvent".

Warning message: _Direct DOM insertion, create a custom control instead_

The following patterns are considered warnings:

```js
document.createElement(foo);
```

## Further Reading


## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
