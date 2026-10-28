# Controller Hook Documentation Does Not Contain a Callback Signature (`sap-controller-hook-missing-callback-signature`)

This rule checks that a controller hook has the @callback signature defined.

The following patterns are considered warnings:
```js
  /**
   * @ControllerHook Short Text here
   * Description on Extension Point usage here.
   *
   * The description should contain information about when the extension is called.
   *
   * If (like in this example) the extension is
   * a callback the customer provides, then it should be documented like:
   *
   * @param {sap.ui.model.json.JSONModel} model ...
   * @return {void}  ...
   *
   */
```

The following patterns are not considered warnings:

```js
  /**
   * @ControllerHook Short Text here
   * Description on Extension Point usage here.
   *
   * The description should contain information about when the extension is called.
   *
   * If (like in this example) the extension is
   * a callback the customer provides, then it should be documented like:
   *
   * @callback sap.ca.scfld.md.controller.BaseDetailController~onDataReceived
   * @param {sap.ui.model.json.JSONModel} model ...
   * @return {void}  ...
   *
   */
```

## Bug Report

If you detect an issue with the check, please open a [GitHub issue](https://github.tools.sap/FIORI-PIPELINE/fioriPipelinesGo/issues).
