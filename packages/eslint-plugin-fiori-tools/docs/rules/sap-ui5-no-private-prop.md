# Disallow usage of private properties and functions of UI5 elements (sap-ui5-no-private-prop)

Usage of private properties and functions from UI5 elements must never be used in Fiori Apps. They can be changed by UI5 at any time and the App might not work anymore.

## Rule Details

This rule detects the usage of private properties and functions of UI5 elements. It checks for properties and methods that are prefixed with an underscore (`_`) or otherwise marked as private in UI5 namespaces.

The rule checks the following UI5 namespaces by default:

- `sap.ui.core`
- `sap.apf`
- `sap.ca.scfld.md`
- `sap.ca.ui`
- `sap.chart`
- `sap.collaboration`
- `sap.fiori`
- `sap.landvisz`
- `sap.m`
- `sap.makit`
- `sap.me`
- `sap.ndc`
- `sap.ovp`
- `sap.portal.ui5`
- `sap.suite.ui.commons`
- `sap.suite.ui.generic.template`
- `sap.suite.ui.microchart`
- `sap.tnt`
- `sap.ui.commons`
- `sap.ui.comp`
- `sap.ui.dt`
- `sap.ui.fl`
- `sap.ui.generic.app`
- `sap.ui.generic.template`
- `sap.ui.layout`
- `sap.ui.richtexteditor`
- `sap.ui.rta`
- `sap.ui.server.abap`
- `sap.ui.server.java`
- `sap.ui.suite`
- `sap.ui.table`
- `sap.ui.unified`
- `sap.ui.ux3`
- `sap.ui.vbm`
- `sap.ui.vk`
- `sap.uiext.inbox`
- `sap.ushell`
- `sap.uxap`
- `sap.viz`

### Configuration

You can add custom namespaces to check by providing them in the rule configuration:

```json
{
  "rules": {
    "@sap-ux/fiori-tools/sap-ui5-no-private-prop": ["error", {
      "ns": ["my.custom.namespace", "another.namespace"]
    }]
  }
}
```

### Warning Message

**Usage of a private property or function from UI5 element.**

The following patterns are considered warnings:

```js
// Accessing private properties (prefixed with underscore)
var oControl = new sap.m.Button();
var privateData = oControl._mProperties; // Warning: private property

// Calling private functions
oControl._doSomethingPrivate(); // Warning: private function

// Accessing private members in expressions
if (oControl._internalState) { // Warning: private property
    // ...
}
```

The following patterns are not considered warnings:

```js
// Using public API
var oControl = new sap.m.Button();
var text = oControl.getText(); // OK: public method
oControl.setText("New Text"); // OK: public method

// Using your own private properties (not from UI5 namespaces)
var myObject = {
    _myPrivateProperty: "value"
};
var value = myObject._myPrivateProperty; // OK: not a UI5 object
```

## False Positives

There might be cases where the check produces a false positive, i.e. you receive a warning but your code is correct and complies to the UI5 guidelines.
In such a case, you can deactivate the rule by placing the following pseudo-comment block around your code.
**Please make sure to have your code reviewed by a colleague before you enter such a pseudo-comment.**

You can disable and enable back warnings of this rule:

```js
/*eslint-disable sap-ui5-no-private-prop*/
   <your code>
/*eslint-enable sap-ui5-no-private-prop*/
```

## Bug Report

In case you detect an issue with the check please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [SAPUI5 API Reference](https://ui5.sap.com/#/api)
- [SAPUI5 Development Guidelines](https://ui5.sap.com/#/topic/28fcd55b04654977b63dacbee0552712)

## Release Information

This rule is part of the Fiori Tools ESLint plugin.
