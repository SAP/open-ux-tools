# Ensure the Correct Export Configuration for Tables in SAP Fiori Elements for V4 Applications (`sap-enable-export`)

## Rule Details

### For OData V2 Applications

Since the `enableExport` is a flex change property, this rule checks if there is a `.change` file for the `enableExport` property, where the `newValue` is set to `false`. This property defines whether to enable the export button in a table. This property rule is applicable to OData V2 applications with a minimum SAPUI5 version of 1.145 or higher. For OData V2 applications with a lower minimum SAPUI5 version, the property name to enable the table export button is `useExportToExcel`.

### For OData V4 Applications

This rule checks if the `enableExport` property is set to `false` in `tableSettings` in the `manifest.json` file for OData V4 applications. This property defines whether to enable the "Export" button in tables.

### Why Was This Rule Introduced?

The export functionality should not be hidden from the preview.

### Warning Message

#### Incorrect `manifest.json` File in OData V4

```json
{
  "tableSettings": {
    "enableExport": false
  }
}
```

The `enableExport` property is set to `false` which hides the "Export" button.

#### Incorrect `.change` File in OData V2

```json
{
  "content": {
    "property": "enableExport",
    "newValue": false
  }
}
```

or for applications with a minimum SAPUI5 version lower than 1.145:

```json
{
  "content": {
    "property": "useExportToExcel",
    "newValue": false
  }
}
```

The `newValue` of the `enableExport` or `useExportToExcel` property is set to `false` which hides the "Export" button.

#### Correct `manifest.json` File in OData V4

```json
{
  "tableSettings": {
    "enableExport": true
  }
}
```

The `enableExport` property is correctly set to `true` or omitted from  `tableSettings`.

#### Correct `.change` File in OData V2

```json
{
  "content": {
    "property": "enableExport",
    "newValue": true
  }
}
```

or for applications with a minimum SAPUI5 version lower than 1.145:

```json
{
  "content": {
    "property": "useExportToExcel",
    "newValue": true
  }
}
```

The `newValue` of the `enableExport` or `useExportToExcel` property is set to `true` to display the "Export" button.

## How to Fix in OData V4

To fix the warning, remove the `enableExport` property from the `manifest.json` file. The "Export" button is shown by default.

## How to Fix in OData V2

To fix the warning, there are two options: either delete the corresponding `.change` file, which restores the default setting, or set `newValue` in the property change file to `true`.

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [Using the Export Button](https://ui5.sap.com/#/topic/4bab6f2043814257974b52d4dafe1dcd)