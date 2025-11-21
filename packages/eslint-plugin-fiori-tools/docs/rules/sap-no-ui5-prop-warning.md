# Disallow usage of private members of UI5 objects (sap-no-ui5-prop-warning)

Private members of UI5 objects must never be used in Fiori Apps. They can be changed by UI5 at anytime and the App might not work anymore.

## Rule Details

The rule checks usage of a member which has the same name as the following UI5 members:

### sap.ui.model.odata.ODataModel, sap.ui.model.odata.v2.ODataModel:

> _oData_

## False Positives

As the check can not determine, whether the property used is from as SAPUI5 object, there might be false positives in case you defined a property with the same name in your own object.
In such a case you can disable the check in your coding like this:

```js

/* eslint-disable sap-no-ui5-prop-warning */

...some code false positives

/* eslint-enable sap-no-ui5-prop-warning*/

```
