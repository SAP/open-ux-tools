# Detect location reload (sap-no-location-reload)

Fiori guidelines do not allow `location.reload()`.

## Rule Details

This checks detects usage of `location.reload()`

The following patterns are considered warnings:

```js
location.reload();
var mylocation = location;
mylocation.reload();
```

Warning message: _location.reload() is not permitted._

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
