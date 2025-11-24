# Disallow usage of session storage (sap-no-sessionstorage)

## Rule Details

For security reasons, the usage of session storage is not allowed in a Fiori application

The following patterns are considered warnings:

```js
sessionStorage.setObj(this.SETTINGS_NAME, this.objSettings);
```

## Bug Report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
