# Ensure the Correct Paste Configuration for Tables in SAP Fiori Elements for V4 Applications (`sap-enable-paste`)

## Rule Details

This rule checks if the `enablePaste` property set to `false` in `tableSettings` in the `manifest.json` file for OData V4 applications. This property sets whether to enable the "Paste" button in Object Page tables.

### Why Was This Rule Introduced?

The paste functionality should not be hidden from the preview.

### Warning Message

#### Incorrect Manifest File

```json
{
  "tableSettings": {
    "enablePaste": false
  }
}
```

The `enablePaste` property is set to `false` which hides the "Paste" button.

#### Correct Manifest File

```json
{
  "tableSettings": {
    "enablePaste": true
  }
}
```

The `enablePaste` property is correctly set to `true` or omitted from  `tableSettings`.

## How to Fix

To fix the warning, remove it from the `manifest.json` file. The "Paste" button is shown by default.

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [UI5 UI Adaptation Documentation](https://ui5.sap.com/#/topic/f6a8fd2812d9442a9bba2f6fb296c42e)