# Discourage usage of global selection (sap-no-global-selection)

## Rule details

warning message: Global selection modification, only modify local selections

The following patterns are considered warnings:

```js
window.getSelection().rangeCount = 9;
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further reading

