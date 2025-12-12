# Disallow usage of private members from sap.ui.base.Event (sap-no-event-prop)

**DEPRECATED: This rule is deprecated. Use `sap-no-ui5base-prop` instead.**

Direct usage of private members from `sap.ui.base.Event` must never be used in Fiori Apps. They can be changed by UI5 at any time and the App might not work anymore.

## Rule Details

This rule detects direct usage of private member properties from `sap.ui.base.Event`.

The following private members are detected:

- `oSource`
- `mParameters`
- `sId`

### Warning Message

**Direct usage of a private member from sap.ui.base.Event detected!**

The following patterns are considered warnings:

```js
// Accessing private members of Event object
function onPress(oEvent) {
    var source = oEvent.oSource; // Warning: private member
    var params = oEvent.mParameters; // Warning: private member
    var id = oEvent.sId; // Warning: private member
}
```

The following patterns are not considered warnings:

```js
// Using public API methods instead
function onPress(oEvent) {
    var source = oEvent.getSource(); // OK: using public API
    var params = oEvent.getParameters(); // OK: using public API
    var id = oEvent.getId(); // OK: using public API
}
```

## False Positives

There might be cases where the check produces a false positive, i.e. you receive a warning but your code is correct and complies to the UI5 guidelines.
In such a case, you can deactivate the rule by placing the following pseudo-comment block around your code.
**Please make sure to have your code reviewed by a colleague before you enter such a pseudo-comment.**

You can disable and enable back warnings of this rule:

```js
/*eslint-disable sap-no-event-prop*/
   <your code>
/*eslint-enable sap-no-event-prop*/
```

## Bug Report

In case you detect an issue with the check please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [SAPUI5 Event API Reference](https://ui5.sap.com/#/api/sap.ui.base.Event)

## Release Information

This rule is part of the Fiori Tools ESLint plugin.
