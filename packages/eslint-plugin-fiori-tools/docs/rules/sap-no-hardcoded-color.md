# Disallow usage of hard coded colors (sap-no-hardcoded-color)

It is not allowed to style Fiori Apps with colors in JavaScript code as they will break the Fiori themes.

## Rule Details

The following patterns are considered warnings:

```js

$(\"<div id='lasso-selection-help' style='position:absolute;pointer-events:none;background:#cccccc;'></div>\");

```

##### How to Fix:

Do not specify colors in custom CSS but use the standard theme-dependent classes instead.

## Bug Report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

