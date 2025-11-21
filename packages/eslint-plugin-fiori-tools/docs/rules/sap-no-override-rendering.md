# Disallow override of control methods (sap-no-override-rendering)

## Rule Details

The check detects override of getters, setters and the functions `onBeforeRendering` and `onAfterRendering` for SAPUI5 controls.

The following patterns are considered warnings:

```js

var oButton5 = new sap.me.foo.bar.Button();"
oButton5.onAfterRendering = function render(){foo.bar = 1;};

```

## Further Reading


## Bug Report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
