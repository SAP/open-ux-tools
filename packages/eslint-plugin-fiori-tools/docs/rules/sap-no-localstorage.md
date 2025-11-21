# Usage of localstorage (sap-no-localstorage)

Local storage must not be used in a Fiori application

## Rule Details

The following patterns are considered warnings:

```js
localStorage.setObj(this.SETTINGS_NAME, this.objSettings);
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
