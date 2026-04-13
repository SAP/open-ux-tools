# Ensure the Correct Export Configuration for Tables in SAP Fiori Elements for V4 Applications (`sap-enable-export`)

## Rule Details

This rule checks if the `enableExport` property set to `false` in `tableSettings` in the `manifest.json` file for OData V4 applications. This property sets whether to enable the "Export" button in tables.

### Why Was This Rule Introduced?

The export functionality should not be hidden from the preview.

### Warning Message

#### Incorrect Manifest File

```json
{
  "tableSettings": {
    "enableExport": false
  }
}
```

The `enableExport` property is set to `false` which hides the "Export" button.

#### Correct Manifest File

```json
{
  "tableSettings": {
    "enableExport": true
  }
}
```

The `enableExport` property is correctly set to `true` or omitted from  `tableSettings`.

## How to Fix

To fix the warning, remove it from the `manifest.json` file. The "Export" button is shown by default.

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [UI5 UI Adaptation Documentation](https://ui5.sap.com/sdk/#/topic/4bab6f2043814257974b52d4dafe1dcd)