# Disallow usage of private properties from sap.ui.base.EventProvider (sap-no-ui5eventprovider-prop)

**DEPRECATED: This rule is deprecated. Use `sap-no-ui5base-prop` instead.**

Direct usage of private properties from `sap.ui.base.EventProvider` must never be used in Fiori Apps. They can be changed by UI5 at any time and the App might not work anymore.

## Rule Details

This rule detects direct usage of private property names from `sap.ui.base.EventProvider`.

The following private properties are detected:

- `mEventRegistry`
- `oEventPool`

### Warning Message

**Direct usage of a private property from sap.ui.base.EventProvider detected!**

The following patterns are considered warnings:

```js
// Accessing private properties of EventProvider
var controller = {
    onInit: function() {
        var registry = this.mEventRegistry; // Warning: private property
        var pool = this.oEventPool; // Warning: private property
    }
};
```

The following patterns are not considered warnings:

```js
// Using public API methods instead
var controller = {
    onInit: function() {
        this.attachEvent("myEvent", handler); // OK: using public API
        this.detachEvent("myEvent", handler); // OK: using public API
        this.fireEvent("myEvent"); // OK: using public API
    }
};
```

## False Positives

There might be cases where the check produces a false positive, i.e. you receive a warning but your code is correct and complies to the UI5 guidelines.
In such a case, you can deactivate the rule by placing the following pseudo-comment block around your code.
**Please make sure to have your code reviewed by a colleague before you enter such a pseudo-comment.**

You can disable and enable back warnings of this rule:

```js
/*eslint-disable sap-no-ui5eventprovider-prop*/
   <your code>
/*eslint-enable sap-no-ui5eventprovider-prop*/
```

## Bug Report

In case you detect an issue with the check please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [SAPUI5 EventProvider API Reference](https://ui5.sap.com/#/api/sap.ui.base.EventProvider)

## Release Information

This rule is part of the Fiori Tools ESLint plugin.
