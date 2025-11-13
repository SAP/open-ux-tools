# Disallow violation for certain options of sap.m.MessageToast (sap-message-toast)

The Fiori design guidelines require a certain behavior of a message toast.

## Rule Details

The check looks for any call of the method `show` on the `sap.m.MessageToast-Object` and checks the following properties:

- `duration` must no be smaller than 3000
- `width` must no be greater then 35em
- `my` must be _center bottom_
- `at` must be _center bottom_

The following patterns are considered warnings:

```js
sap.m.MessageToast.show('This is a warning!', { duration: 1000 });
```

The following patterns are not ot considered warnings:

```js
sap.m.MessageToast.show('This is a warning!');
```

## Bug report

In case you think the finding is a false positive, open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
