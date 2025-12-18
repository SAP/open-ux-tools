# Disallow usage of the jQuery device APIs (sap-no-jquery-device-api)

The `jQuery` device API is deprecated since 1.20. The respective functions of `sap.ui.Device` should be used instead.

## Rule Details

The check looks for any call of `jQuery.device`.

The following patterns are considered warnings:

```js
if (jQuery.device.is.android_phone === false) {
}

if ($.device.is.android_phone === false) {
}
```

The following patterns are not not considered warnings:

```js
if (!sap.ui.Device.system.desktop) {
  this.getView().byId('factSheetButton').setVisible(false);
}
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

