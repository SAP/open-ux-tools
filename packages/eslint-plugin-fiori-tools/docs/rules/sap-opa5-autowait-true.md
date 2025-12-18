
# autoWait must be true in extendConfig
This rule checks if **autoWait** has been set to **true** in **Opa5.extendConfig** method.


## Rule Details
This rule aims to avoid unstable OPA test code which does not follow the [recommendation](https://sapui5.hana.ondemand.com/#/api/sap.ui.test.Opa5%23methods/waitFor) to use the autoWait logic. 
This rule aims to detect error in OPA test code. Checks if the autoWait param is set and the value is true. The rule throws error otherwise when the autoWait is not present or is set to false.


```js
autoWait: true,
```
