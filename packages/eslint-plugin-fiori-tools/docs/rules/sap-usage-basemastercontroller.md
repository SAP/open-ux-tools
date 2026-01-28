# Detect usage of BaseMasterController (sap-usage-basemastercontroller)

The `BaseMasterController` is a deprecated controller and should be replaced by `sap.ca.scfld.md.controller.ScfldMasterController`.

## Rule Details

The rule detects the usage of the object `sap.ca.scfld.md.controller.BaseMasterController` and the usage of the string `sap/ca/scfld/md/controller/BaseMasterController`, like in define-methods.

The following patterns are considered warnings:

```js
sap.ca.scfld.md.controller.BaseMasterController.extend('myBaseController', {
  config: 'myconfig',
});

define(['sap/ca/scfld/md/controller/BaseMasterController'], function (
  Controller
) {
  Controller.extend('myBaseController', {
    config: 'myconfig',
  });
});
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
