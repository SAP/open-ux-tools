# Disallow override of csap-no-override-storage-prototype (sap-no-override-storage-prototype)

## Rule Details

Storage prototype must not be overridden as this can lead to unpredictable errors

The following patterns are considered warnings:

```js
Storage.prototype.setObj = function (key, obj) {};
```

## Bug Report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
