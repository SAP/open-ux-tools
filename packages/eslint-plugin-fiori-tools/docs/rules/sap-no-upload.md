# Prevent Usage of Upload Controls (`sap-no-upload`)

Dynamically constructed upload controls must not be used. Uploaded files must be sent to Virus Scanning Interface (VSI) 2.0 before being stored on the database.

## Rule Details

This rule prevents the usage of `sap.ca.ui.FileUpload` and `sap.ca.ui.AddPicture` upload controls to ensure security compliance. These controls can be instantiated in the following ways and both are forbidden:

- Using the `new` operator (constructor)
- Direct function call

The following patterns are considered errors:

```js
// Constructor instantiation
var oFileUpload = new sap.ca.ui.FileUpload();
var oAddPicture = new sap.ca.ui.AddPicture();

// Function call instantiation  
var oFileUpload = sap.ca.ui.FileUpload();
var oAddPicture = sap.ca.ui.AddPicture();

// With configuration objects
var oFileUpload = new sap.ca.ui.FileUpload({
    acceptRequestHeader: "application/json",
    uploadUrl: "/upload",
    encodeUrl: "/encode_file"
});
```

## Rationale

Upload controls pose security risks as they allow users to upload files directly to the system. To maintain security compliance, all uploaded files must be processed using VSI 2.0 before being stored in the database. This rule helps enforce this security policy by preventing the use of these upload controls.

## Bug Report

If you detect a false positive, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).